import { afterEach, describe, expect, it, vi } from "vitest";
import { createWatchChannel, stopWatchChannel } from "./google-calendar-watch";

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

describe("createWatchChannel", () => {
  it("posts to the calendar's watch endpoint and parses the expiration", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ resourceId: "res-1", expiration: "1798761600000" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createWatchChannel({
      accessToken: "token-1",
      calendarId: "primary",
      channelId: "channel-1",
      address: "https://app.example.com/api/google-calendar/webhook",
      token: "signed-token",
    });

    expect(result).toEqual({ resourceId: "res-1", expiresAt: new Date(1798761600000) });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events/watch");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      id: "channel-1",
      type: "web_hook",
      address: "https://app.example.com/api/google-calendar/webhook",
      token: "signed-token",
    });
  });

  it("throws with the response body on a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid" }, { ok: false, status: 400 })),
    );

    await expect(
      createWatchChannel({
        accessToken: "token-1",
        calendarId: "primary",
        channelId: "channel-1",
        address: "https://app.example.com/webhook",
        token: "t",
      }),
    ).rejects.toThrow(/400/);
  });
});

describe("stopWatchChannel", () => {
  it("posts to the channels/stop endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await stopWatchChannel({ accessToken: "token-1", channelId: "channel-1", resourceId: "res-1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/channels/stop");
    expect(JSON.parse(init.body as string)).toEqual({ id: "channel-1", resourceId: "res-1" });
  });

  it("does not throw when the channel is already gone (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 })));

    await expect(
      stopWatchChannel({ accessToken: "token-1", channelId: "channel-1", resourceId: "res-1" }),
    ).resolves.toBeUndefined();
  });

  it("throws on a real failure (not 404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await expect(
      stopWatchChannel({ accessToken: "token-1", channelId: "channel-1", resourceId: "res-1" }),
    ).rejects.toThrow(/500/);
  });
});
