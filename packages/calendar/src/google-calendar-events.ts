const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// Sync token do Google expirou (Google recomenda refazer sync completo) — quem
// chama deve limpar o syncToken salvo e repetir com timeMin em vez de syncToken.
export class GoogleCalendarSyncTokenExpiredError extends Error {
  constructor() {
    super("syncToken expirado — é preciso refazer o sync completo.");
    this.name = "GoogleCalendarSyncTokenExpiredError";
  }
}

export interface GoogleCalendarEventSummary {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  /** null quando o evento é dia-inteiro (só "date", sem "dateTime") ou não tem horário. */
  startsAt: Date | null;
  endsAt: Date | null;
  /** true quando o evento tem extendedProperties.private.bookingId — foi o próprio app que criou. */
  isAppManaged: boolean;
}

interface RawGoogleEvent {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export function toEventSummary(raw: RawGoogleEvent): GoogleCalendarEventSummary {
  const startsAt = raw.start?.dateTime ? new Date(raw.start.dateTime) : null;
  const endsAt = raw.end?.dateTime ? new Date(raw.end.dateTime) : null;
  return {
    id: raw.id,
    status: raw.status,
    startsAt,
    endsAt,
    isAppManaged: Boolean(raw.extendedProperties?.private?.bookingId),
  };
}

export interface ListCalendarEventsPageInput {
  accessToken: string;
  calendarId: string;
  /** Presente = sync incremental. Ausente = sync completo (usa timeMinIso). Nunca os dois juntos — a API do Google rejeita. */
  syncToken?: string;
  /** Só usado quando syncToken está ausente (primeiro sync). */
  timeMinIso?: string;
  pageToken?: string;
}

export interface ListCalendarEventsPageResult {
  events: GoogleCalendarEventSummary[];
  nextPageToken: string | null;
  /** Só vem preenchido na ÚLTIMA página — guardar pra próxima sincronização incremental. */
  nextSyncToken: string | null;
}

export async function listCalendarEventsPage(
  input: ListCalendarEventsPageInput,
): Promise<ListCalendarEventsPageResult> {
  const url = new URL(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events`);
  // singleEvents expande instâncias recorrentes — sem isso um evento recorrente
  // vem como um único "mestre" sem data concreta, inútil pra bloquear agenda.
  url.searchParams.set("singleEvents", "true");
  if (input.syncToken) {
    url.searchParams.set("syncToken", input.syncToken);
  } else if (input.timeMinIso) {
    url.searchParams.set("timeMin", input.timeMinIso);
  }
  if (input.pageToken) {
    url.searchParams.set("pageToken", input.pageToken);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });

  if (response.status === 410) {
    throw new GoogleCalendarSyncTokenExpiredError();
  }
  if (!response.ok) {
    throw new Error(`Falha ao listar eventos do Google Calendar (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as {
    items?: RawGoogleEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
  };

  return {
    events: (data.items ?? []).map(toEventSummary),
    nextPageToken: data.nextPageToken ?? null,
    nextSyncToken: data.nextSyncToken ?? null,
  };
}
