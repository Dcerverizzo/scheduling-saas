import { BLOCKING_BOOKING_STATUSES } from "@scheduling-saas/domain";
import { prisma, type Booking, type GoogleCalendarConnection } from "@scheduling-saas/database";
import type { GoogleCalendarSyncJobData } from "@scheduling-saas/queue";
import {
  buildBookingEventBody,
  createCalendarEvent,
  decryptToken,
  deleteCalendarEvent,
  GoogleCalendarEventNotFoundError,
  refreshAccessToken,
  updateCalendarEvent,
} from "@scheduling-saas/calendar";

function getGoogleOAuthEnv(): { clientId: string; clientSecret: string; encryptionKey: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !encryptionKey) {
    throw new Error(
      "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY não configurados no worker.",
    );
  }
  return { clientId, clientSecret, encryptionKey };
}

// Mesma filosofia do processBookingReminderJob: reconfere o estado ATUAL do booking no
// momento do processamento, nunca confia na intenção capturada quando o job foi
// enfileirado — um job só cobre create/update/cancel/reschedule.
export async function processGoogleCalendarSyncJob(data: GoogleCalendarSyncJobData): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { company: true, staff: { include: { googleCalendarConnection: true } } },
  });
  if (!booking) {
    console.log(`[google-calendar-sync] booking ${data.bookingId} não existe mais, pulando`);
    return;
  }

  const connection = booking.staff.googleCalendarConnection;
  if (!connection) {
    console.log(
      `[google-calendar-sync] staff ${booking.staffId} desconectou o Google Calendar depois de enfileirar, pulando`,
    );
    return;
  }

  try {
    const { clientId, clientSecret, encryptionKey } = getGoogleOAuthEnv();
    const refreshToken = decryptToken(connection.refreshToken, encryptionKey);
    const { accessToken } = await refreshAccessToken({ refreshToken, clientId, clientSecret });

    await syncBookingToGoogleCalendar(booking, connection, accessToken);

    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", lastSyncedAt: new Date(), lastErrorAt: null, lastErrorMessage: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar.";
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastErrorAt: new Date(), lastErrorMessage: message },
    });
    // Propaga pro BullMQ aplicar retry/backoff — um erro transitório da API do Google
    // não deve exigir que o staff reconecte manualmente.
    throw error;
  }
}

async function syncBookingToGoogleCalendar(
  booking: Booking,
  connection: GoogleCalendarConnection,
  accessToken: string,
): Promise<void> {
  const existingEvent = await prisma.bookingCalendarEvent.findUnique({
    where: { bookingId: booking.id },
  });

  const isBlocking = (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(booking.status);

  if (!isBlocking) {
    if (existingEvent) {
      await deleteCalendarEvent({
        accessToken,
        calendarId: existingEvent.calendarId,
        eventId: existingEvent.googleEventId,
      });
      await prisma.bookingCalendarEvent.delete({ where: { id: existingEvent.id } });
    }
    return;
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: booking.companyId } });
  const eventBody = buildBookingEventBody({
    bookingId: booking.id,
    companyId: booking.companyId,
    companyName: company.name,
    serviceName: booking.serviceNameSnapshot,
    customerName: booking.customerNameSnapshot,
    customerPhone: booking.customerPhoneSnapshot,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    timezone: company.timezone,
  });

  if (existingEvent) {
    try {
      await updateCalendarEvent({
        accessToken,
        calendarId: existingEvent.calendarId,
        eventId: existingEvent.googleEventId,
        event: eventBody,
      });
      return;
    } catch (error) {
      if (!(error instanceof GoogleCalendarEventNotFoundError)) {
        throw error;
      }
      // Staff apagou o evento manualmente no Google (decisão 4 do design de Calendar
      // no PRD) — recria abaixo em vez de propagar erro.
      await prisma.bookingCalendarEvent.delete({ where: { id: existingEvent.id } });
    }
  }

  const created = await createCalendarEvent({ accessToken, calendarId: connection.calendarId, event: eventBody });
  await prisma.bookingCalendarEvent.create({
    data: {
      companyId: booking.companyId,
      staffId: booking.staffId,
      bookingId: booking.id,
      googleEventId: created.id,
      calendarId: connection.calendarId,
    },
  });
}
