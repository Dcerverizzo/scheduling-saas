import { describe, expect, it } from "vitest";
import { createWatchChannelToken, verifyWatchChannelToken } from "./webhook-token";

describe("createWatchChannelToken / verifyWatchChannelToken", () => {
  it("verifies a token signed for the same connection and secret", () => {
    const token = createWatchChannelToken("connection-1", "secret-a");
    expect(verifyWatchChannelToken(token, "connection-1", "secret-a")).toBe(true);
  });

  it("is deterministic (same input, same token every time — needed since Google replays it)", () => {
    const first = createWatchChannelToken("connection-1", "secret-a");
    const second = createWatchChannelToken("connection-1", "secret-a");
    expect(first).toBe(second);
  });

  it("rejects a token checked against the wrong connectionId", () => {
    const token = createWatchChannelToken("connection-1", "secret-a");
    expect(verifyWatchChannelToken(token, "connection-2", "secret-a")).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createWatchChannelToken("connection-1", "secret-a");
    expect(verifyWatchChannelToken(token, "connection-1", "secret-b")).toBe(false);
  });

  it("rejects a garbage token", () => {
    expect(verifyWatchChannelToken("not-a-real-token", "connection-1", "secret-a")).toBe(false);
  });
});
