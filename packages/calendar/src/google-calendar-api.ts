import type { GoogleCalendarEventBody } from "./booking-event-body";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// Sinaliza especificamente "o evento não existe mais do lado do Google" (staff apagou
// manualmente) pra quem chama poder recriar em vez de tratar como falha genérica —
// decisão 4 do design de Calendar no PRD ("só recriado no próximo sync outbound").
export class GoogleCalendarEventNotFoundError extends Error {
  constructor() {
    super("Evento não encontrado no Google Calendar (provavelmente apagado manualmente).");
    this.name = "GoogleCalendarEventNotFoundError";
  }
}

interface CalendarRequestInput {
  accessToken: string;
  calendarId: string;
}

function eventsUrl(calendarId: string, eventId?: string): string {
  const base = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

export async function createCalendarEvent(
  input: CalendarRequestInput & { event: GoogleCalendarEventBody },
): Promise<{ id: string }> {
  const response = await fetch(eventsUrl(input.calendarId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.event),
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao criar evento no Google Calendar (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as { id: string };
  return { id: data.id };
}

export async function updateCalendarEvent(
  input: CalendarRequestInput & { eventId: string; event: GoogleCalendarEventBody },
): Promise<void> {
  const response = await fetch(eventsUrl(input.calendarId, input.eventId), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.event),
  });

  if (response.status === 404 || response.status === 410) {
    throw new GoogleCalendarEventNotFoundError();
  }
  if (!response.ok) {
    throw new Error(
      `Falha ao atualizar evento no Google Calendar (${response.status}): ${await response.text()}`,
    );
  }
}

export async function deleteCalendarEvent(
  input: CalendarRequestInput & { eventId: string },
): Promise<void> {
  const response = await fetch(eventsUrl(input.calendarId, input.eventId), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });

  // 404/410: já estava apagado (por nós antes, ou manualmente pelo staff) — é o
  // estado desejado, não uma falha.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(
      `Falha ao apagar evento no Google Calendar (${response.status}): ${await response.text()}`,
    );
  }
}
