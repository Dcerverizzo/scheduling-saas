import { randomUUID } from "node:crypto";
import { prisma, type GoogleCalendarConnection } from "@scheduling-saas/database";
import {
  buildAvailabilityExceptionDiff,
  createWatchChannel,
  createWatchChannelToken,
  GoogleCalendarSyncTokenExpiredError,
  listCalendarEventsPage,
  stopWatchChannel,
  type GoogleCalendarEventSummary,
} from "@scheduling-saas/calendar";
import { getValidAccessToken } from "./google-calendar-auth";

// Renova com folga de 1 dia antes de expirar — não deixa a janela apertar até
// o fio da navalha (Google Calendar watch dura só até ~1 mês).
const WATCH_RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function getWebhookConfig(): { authSecret: string; webhookUrl: string } {
  const authSecret = process.env.AUTH_SECRET;
  const authUrl = process.env.AUTH_URL;
  if (!authSecret || !authUrl) {
    throw new Error("AUTH_SECRET/AUTH_URL não configurados no worker.");
  }
  return { authSecret, webhookUrl: `${authUrl}/api/google-calendar/webhook` };
}

// Sync inbound (decisão 3 do design de Calendar no PRD): evento pessoal do
// Google vira AvailabilityException, sem motor de disponibilidade novo. Roda
// tanto sob demanda (webhook do Google, connect inicial) quanto na
// reconciliação periódica — mesma função pros dois gatilhos.
export async function syncInboundAvailability(connectionId: string): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection) {
    console.log(`[google-calendar-inbound-sync] conexão ${connectionId} não existe mais, pulando`);
    return;
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const nextSyncToken = await syncAvailabilityExceptions(connection, accessToken);

    try {
      await ensureWatchChannel(connection, accessToken);
    } catch (watchError) {
      // Best-effort: o Google exige um endereço público (HTTPS) pro webhook — em dev
      // local (AUTH_URL=http://localhost) isso SEMPRE falha, e não pode descartar um
      // sync de disponibilidade que já funcionou. A reconciliação periódica cobre a
      // falta de push notification enquanto o canal não existir.
      console.error(
        `[google-calendar-inbound-sync] falha ao garantir canal de watch da conexão ${connection.id}:`,
        watchError,
      );
    }

    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncToken: nextSyncToken,
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar.";
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastErrorAt: new Date(), lastErrorMessage: message },
    });
    throw error;
  }
}

async function syncAvailabilityExceptions(
  connection: GoogleCalendarConnection,
  accessToken: string,
): Promise<string | null> {
  let syncToken = connection.syncToken ?? undefined;
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  let alreadyRetriedAsFullSync = false;

  while (true) {
    let page;
    try {
      page = await listCalendarEventsPage({
        accessToken,
        calendarId: connection.calendarId,
        syncToken,
        // Só usado quando não há syncToken (primeiro sync) — evita puxar o
        // histórico inteiro do calendário, só o que ainda pode afetar a agenda.
        timeMinIso: syncToken ? undefined : new Date().toISOString(),
        pageToken,
      });
    } catch (error) {
      if (error instanceof GoogleCalendarSyncTokenExpiredError && !alreadyRetriedAsFullSync) {
        // syncToken velho demais pro Google — reseta e refaz como sync completo,
        // uma única vez (não pode entrar em loop se o full sync também falhar assim).
        syncToken = undefined;
        pageToken = undefined;
        alreadyRetriedAsFullSync = true;
        continue;
      }
      throw error;
    }

    if (page.events.length > 0) {
      await applyEventsDiff(connection, page.events);
    }
    if (page.nextSyncToken) {
      nextSyncToken = page.nextSyncToken;
    }
    if (!page.nextPageToken) {
      break;
    }
    pageToken = page.nextPageToken;
  }

  return nextSyncToken;
}

async function applyEventsDiff(
  connection: GoogleCalendarConnection,
  events: GoogleCalendarEventSummary[],
): Promise<void> {
  const externalEventIds = events.map((event) => event.id);
  const existing = await prisma.availabilityException.findMany({
    where: {
      staffId: connection.staffId,
      source: "GOOGLE_CALENDAR",
      externalEventId: { in: externalEventIds },
    },
  });

  const diff = buildAvailabilityExceptionDiff({
    googleEvents: events,
    existingExceptions: existing.map((exception) => ({
      // findMany já filtrou externalEventId no where "in" (nunca null aqui).
      externalEventId: exception.externalEventId as string,
      startsAt: exception.startsAt,
      endsAt: exception.endsAt,
    })),
  });

  for (const item of [...diff.toCreate, ...diff.toUpdate]) {
    await prisma.availabilityException.upsert({
      where: {
        staffId_externalEventId: { staffId: connection.staffId, externalEventId: item.externalEventId },
      },
      create: {
        companyId: connection.companyId,
        staffId: connection.staffId,
        type: "BLOCK",
        source: "GOOGLE_CALENDAR",
        externalEventId: item.externalEventId,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      },
      update: { startsAt: item.startsAt, endsAt: item.endsAt },
    });
  }

  if (diff.toDeleteExternalEventIds.length > 0) {
    await prisma.availabilityException.deleteMany({
      where: { staffId: connection.staffId, externalEventId: { in: diff.toDeleteExternalEventIds } },
    });
  }
}

async function ensureWatchChannel(connection: GoogleCalendarConnection, accessToken: string): Promise<void> {
  const needsRenewal =
    !connection.watchExpiresAt ||
    connection.watchExpiresAt.getTime() - Date.now() < WATCH_RENEWAL_THRESHOLD_MS;
  if (!needsRenewal) {
    return;
  }

  if (connection.watchChannelId && connection.watchResourceId) {
    // Best-effort — se o canal antigo já não existir do lado do Google (expirou
    // sozinho), stopWatchChannel já trata 404 como sucesso; qualquer outro erro
    // aqui não deve impedir a criação do canal novo.
    await stopWatchChannel({
      accessToken,
      channelId: connection.watchChannelId,
      resourceId: connection.watchResourceId,
    }).catch((error: unknown) => {
      console.error(
        `[google-calendar-inbound-sync] falha ao parar canal antigo da conexão ${connection.id}:`,
        error,
      );
    });
  }

  const { authSecret, webhookUrl } = getWebhookConfig();
  const channelId = randomUUID();
  const token = createWatchChannelToken(connection.id, authSecret);

  const watch = await createWatchChannel({
    accessToken,
    calendarId: connection.calendarId,
    channelId,
    address: webhookUrl,
    token,
  });

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { watchChannelId: channelId, watchResourceId: watch.resourceId, watchExpiresAt: watch.expiresAt },
  });
}
