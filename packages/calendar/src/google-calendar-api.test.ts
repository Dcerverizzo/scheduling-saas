import { afterEach, describe, expect, it, vi } from "vitest";
import type { GoogleCalendarEventBody } from "./booking-event-body";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  GoogleCalendarEventNotFoundError,
  updateCalendarEvent,
} from "./google-calendar-api";

const SAMPLE_EVENT: GoogleCalendarEventBody = {
  summary: "Corte — Maria",
  start: { dateTime: "2026-08-24T12:00:00.000Z", timeZone: "America/Sao_Paulo" },
  end: { dateTime: "2026-08-24T13:00:00.000Z", timeZone: "America/Sao_Paulo" },
  extendedProperties: { private: { bookingId: "booking-1", companyId: "company-1" } },
};

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCalendarEvent", () => {
  it("posts to the calendar's events endpoint and returns the created id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "gcal-event-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCalendarEvent({
      accessToken: "token-1",
      calendarId: "primary",
      event: SAMPLE_EVENT,
    });

    expect(result).toEqual({ id: "gcal-event-1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
    expect(JSON.parse(init.body as string)).toEqual(SAMPLE_EVENT);
  });

  it("URL-encodes the calendarId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "gcal-event-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await createCalendarEvent({
      accessToken: "token-1",
      calendarId: "staff+extra@group.calendar.google.com",
      event: SAMPLE_EVENT,
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/staff%2Bextra%40group.calendar.google.com/events",
    );
  });

  it("throws with the response body on a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid" }, { ok: false, status: 400 })),
    );

    await expect(
      createCalendarEvent({ accessToken: "token-1", calendarId: "primary", event: SAMPLE_EVENT }),
    ).rejects.toThrow(/400/);
  });
});

describe("updateCalendarEvent", () => {
  it("puts to the specific event's endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await updateCalendarEvent({
      accessToken: "token-1",
      calendarId: "primary",
      eventId: "gcal-event-1",
      event: SAMPLE_EVENT,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events/gcal-event-1");
    expect(init.method).toBe("PUT");
  });

  it("throws GoogleCalendarEventNotFoundError on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 })));

    await expect(
      updateCalendarEvent({
        accessToken: "token-1",
        calendarId: "primary",
        eventId: "gone",
        event: SAMPLE_EVENT,
      }),
    ).rejects.toThrow(GoogleCalendarEventNotFoundError);
  });

  it("throws GoogleCalendarEventNotFoundError on 410 (gone)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 410 })));

    await expect(
      updateCalendarEvent({
        accessToken: "token-1",
        calendarId: "primary",
        eventId: "gone",
        event: SAMPLE_EVENT,
      }),
    ).rejects.toThrow(GoogleCalendarEventNotFoundError);
  });

  it("throws a plain error (not GoogleCalendarEventNotFoundError) on other non-ok statuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    let caught: unknown;
    try {
      await updateCalendarEvent({
        accessToken: "token-1",
        calendarId: "primary",
        eventId: "gcal-event-1",
        event: SAMPLE_EVENT,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(GoogleCalendarEventNotFoundError);
  });
});

describe("deleteCalendarEvent", () => {
  it("deletes at the specific event's endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await deleteCalendarEvent({ accessToken: "token-1", calendarId: "primary", eventId: "gcal-event-1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events/gcal-event-1");
    expect(init.method).toBe("DELETE");
  });

  it("does not throw when the event is already gone (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 })));

    await expect(
      deleteCalendarEvent({ accessToken: "token-1", calendarId: "primary", eventId: "gone" }),
    ).resolves.toBeUndefined();
  });

  it("throws on a real failure (not 404/410)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await expect(
      deleteCalendarEvent({ accessToken: "token-1", calendarId: "primary", eventId: "gcal-event-1" }),
    ).rejects.toThrow(/500/);
  });
});
