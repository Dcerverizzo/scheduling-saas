import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  refreshAccessToken,
} from "./google-oauth-client";

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

describe("buildGoogleAuthorizationUrl", () => {
  it("builds the authorization URL with every required param", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: "client-id",
        redirectUri: "https://app.example.com/api/google-calendar/callback",
        state: "signed-state",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/google-calendar/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toContain("calendar.events");
  });
});

describe("exchangeCodeForTokens", () => {
  it("posts the authorization_code grant and parses the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/calendar.events",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeCodeForTokens({
      code: "auth-code",
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://app.example.com/api/google-calendar/callback",
    });

    expect(result).toEqual({
      accessToken: "access-123",
      refreshToken: "refresh-456",
      expiresInSeconds: 3600,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
  });

  it("returns null refreshToken when Google omits it (already-authorized case)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ access_token: "access-123", expires_in: 3600, scope: "calendar.events" }),
      ),
    );

    const result = await exchangeCodeForTokens({
      code: "auth-code",
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://app.example.com/api/google-calendar/callback",
    });

    expect(result.refreshToken).toBeNull();
  });

  it("throws with the response body when Google returns a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid_grant" }, { ok: false, status: 400 })),
    );

    await expect(
      exchangeCodeForTokens({
        code: "bad-code",
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "https://app.example.com/api/google-calendar/callback",
      }),
    ).rejects.toThrow(/400/);
  });
});

describe("refreshAccessToken", () => {
  it("posts the refresh_token grant and parses the response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ access_token: "new-access", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshAccessToken({
      refreshToken: "refresh-456",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    expect(result).toEqual({ accessToken: "new-access", expiresInSeconds: 3600 });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-456");
  });
});

describe("fetchGoogleAccountEmail", () => {
  it("returns the email from the userinfo endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ email: "staff@gmail.com" })));

    await expect(fetchGoogleAccountEmail("access-123")).resolves.toBe("staff@gmail.com");
  });

  it("throws when the response has no email", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));

    await expect(fetchGoogleAccountEmail("access-123")).rejects.toThrow(/email/);
  });
});
