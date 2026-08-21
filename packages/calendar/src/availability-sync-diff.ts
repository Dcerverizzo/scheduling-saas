import type { GoogleCalendarEventSummary } from "./google-calendar-events";

export interface ExistingSyncedException {
  externalEventId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilityExceptionUpsert {
  externalEventId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilityExceptionDiff {
  toCreate: AvailabilityExceptionUpsert[];
  toUpdate: AvailabilityExceptionUpsert[];
  toDeleteExternalEventIds: string[];
}

// Pura — sem Prisma, sem fetch — decide o que fazer com cada evento retornado
// pelo sync incremental do Google. Sync incremental só devolve o que MUDOU
// desde a última vez, então "toDelete" não precisa comparar contra a lista
// inteira de exceções existentes — o próprio Google avisa via status=cancelled.
export function buildAvailabilityExceptionDiff(input: {
  googleEvents: GoogleCalendarEventSummary[];
  existingExceptions: ExistingSyncedException[];
}): AvailabilityExceptionDiff {
  const existingByExternalId = new Map(
    input.existingExceptions.map((exception) => [exception.externalEventId, exception]),
  );

  const toCreate: AvailabilityExceptionUpsert[] = [];
  const toUpdate: AvailabilityExceptionUpsert[] = [];
  const toDeleteExternalEventIds: string[] = [];

  for (const event of input.googleEvents) {
    // Cancelado no Google, ou criado pelo próprio app (o outbound já cuida
    // desse evento — não duplica como bloqueio) — nunca vira/continua bloqueio.
    const removed = event.status === "cancelled" || event.isAppManaged;
    if (removed) {
      if (existingByExternalId.has(event.id)) {
        toDeleteExternalEventIds.push(event.id);
      }
      continue;
    }

    // Evento dia-inteiro (sem horário) — ambíguo demais pra virar bloqueio
    // automático (pode ser um lembrete, não necessariamente indisponibilidade).
    if (!event.startsAt || !event.endsAt) {
      continue;
    }

    const existing = existingByExternalId.get(event.id);
    if (!existing) {
      toCreate.push({ externalEventId: event.id, startsAt: event.startsAt, endsAt: event.endsAt });
    } else if (
      existing.startsAt.getTime() !== event.startsAt.getTime() ||
      existing.endsAt.getTime() !== event.endsAt.getTime()
    ) {
      toUpdate.push({ externalEventId: event.id, startsAt: event.startsAt, endsAt: event.endsAt });
    }
  }

  return { toCreate, toUpdate, toDeleteExternalEventIds };
}
