import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleCalendarSyncTokenExpiredError,
  listCalendarEventsPage,
  toEventSummary,
} from "./google-calendar-events";

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

describe("toEventSummary", () => {
  it("maps a timed event", () => {
    const summary = toEventSummary({
      id: "evt-1",
      status: "confirmed",
      start: { dateTime: "2026-08-24T12:00:00.000Z" },
      end: { dateTime: "2026-08-24T13:00:00.000Z" },
    });

    expect(summary).toEqual({
      id: "evt-1",
      status: "confirmed",
      startsAt: new Date("2026-08-24T12:00:00.000Z"),
      endsAt: new Date("2026-08-24T13:00:00.000Z"),
      isAppManaged: false,
    });
  });

  it("maps an all-day event to null start/end", () => {
    const summary = toEventSummary({
      id: "evt-1",
      status: "confirmed",
      start: { date: "2026-08-24" },
      end: { date: "2026-08-25" },
    });

    expect(summary.startsAt).toBeNull();
    expect(summary.endsAt).toBeNull();
  });

  it("marks an event as app-managed when it carries a bookingId", () => {
    const summary = toEventSummary({
      id: "evt-1",
      status: "confirmed",
      start: { dateTime: "2026-08-24T12:00:00.000Z" },
      end: { dateTime: "2026-08-24T13:00:00.000Z" },
      extendedProperties: { private: { bookingId: "booking-1" } },
    });

    expect(summary.isAppManaged).toBe(true);
  });
});

describe("listCalendarEventsPage", () => {
  it("uses timeMin (not syncToken) on the first sync", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], nextSyncToken: "sync-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await listCalendarEventsPage({
      accessToken: "token-1",
      calendarId: "primary",
      timeMinIso: "2026-08-24T00:00:00.000Z",
    });

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get("timeMin")).toBe("2026-08-24T00:00:00.000Z");
    expect(url.searchParams.get("syncToken")).toBeNull();
    expect(url.searchParams.get("singleEvents")).toBe("true");
  });

  it("uses syncToken (not timeMin) on incremental sync", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await listCalendarEventsPage({
      accessToken: "token-1",
      calendarId: "primary",
      syncToken: "sync-1",
      timeMinIso: "2026-08-24T00:00:00.000Z",
    });

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get("syncToken")).toBe("sync-1");
    expect(url.searchParams.get("timeMin")).toBeNull();
  });

  it("returns mapped events and pagination tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            {
              id: "evt-1",
              status: "confirmed",
              start: { dateTime: "2026-08-24T12:00:00.000Z" },
              end: { dateTime: "2026-08-24T13:00:00.000Z" },
            },
          ],
          nextPageToken: "page-2",
        }),
      ),
    );

    const result = await listCalendarEventsPage({
      accessToken: "token-1",
      calendarId: "primary",
      syncToken: "sync-1",
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.id).toBe("evt-1");
    expect(result.nextPageToken).toBe("page-2");
    expect(result.nextSyncToken).toBeNull();
  });

  it("throws GoogleCalendarSyncTokenExpiredError on 410", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 410 })));

    await expect(
      listCalendarEventsPage({ accessToken: "token-1", calendarId: "primary", syncToken: "stale" }),
    ).rejects.toThrow(GoogleCalendarSyncTokenExpiredError);
  });

  it("throws a generic error on other non-ok statuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await expect(
      listCalendarEventsPage({ accessToken: "token-1", calendarId: "primary", syncToken: "s" }),
    ).rejects.toThrow(/500/);
  });
});
