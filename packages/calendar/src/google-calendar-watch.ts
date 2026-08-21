const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface CreateWatchChannelInput {
  accessToken: string;
  calendarId: string;
  channelId: string;
  /** URL pública do webhook (HTTPS obrigatório em produção). */
  address: string;
  /** Ecoado pelo Google em todo POST do webhook — usado pra autenticar a origem (ver webhook-token.ts). */
  token: string;
}

export interface WatchChannel {
  resourceId: string;
  /** Epoch ms — o Google manda como string. */
  expiresAt: Date;
}

export async function createWatchChannel(input: CreateWatchChannelInput): Promise<WatchChannel> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: input.channelId,
        type: "web_hook",
        address: input.address,
        token: input.token,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Falha ao criar canal de webhook no Google Calendar (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as { resourceId: string; expiration: string };
  return { resourceId: data.resourceId, expiresAt: new Date(Number(data.expiration)) };
}

export async function stopWatchChannel(input: {
  accessToken: string;
  channelId: string;
  resourceId: string;
}): Promise<void> {
  const response = await fetch(`${CALENDAR_API_BASE}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: input.channelId, resourceId: input.resourceId }),
  });

  // 404: o canal já não existe do lado do Google (expirado ou já parado) — é
  // o estado desejado, não uma falha. Mesma lógica de deleteCalendarEvent.
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Falha ao parar canal de webhook no Google Calendar (${response.status}): ${await response.text()}`,
    );
  }
}
