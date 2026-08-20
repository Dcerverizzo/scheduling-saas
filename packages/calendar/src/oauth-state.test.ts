import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "./oauth-state";

const SECRET = "test-secret";

describe("createOAuthState / verifyOAuthState", () => {
  it("round-trips staffId and companySlug", () => {
    const token = createOAuthState({ staffId: "staff-1", companySlug: "barbearia-do-joao" }, SECRET);

    const result = verifyOAuthState(token, SECRET);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.staffId).toBe("staff-1");
      expect(result.payload.companySlug).toBe("barbearia-do-joao");
    }
  });

  it("generates a different nonce on every call", () => {
    const first = createOAuthState({ staffId: "staff-1", companySlug: "empresa" }, SECRET);
    const second = createOAuthState({ staffId: "staff-1", companySlug: "empresa" }, SECRET);

    expect(first).not.toBe(second);
  });

  it("rejects a state signed with a different secret", () => {
    const token = createOAuthState({ staffId: "staff-1", companySlug: "empresa" }, SECRET);

    const result = verifyOAuthState(token, "other-secret");

    expect(result).toEqual({ valid: false, reason: "INVALID_SIGNATURE" });
  });

  it("rejects a tampered payload even with the original signature reattached", () => {
    const token = createOAuthState({ staffId: "staff-1", companySlug: "empresa" }, SECRET);
    const [originalBody, originalSignature] = token.split(".") as [string, string];
    const tamperedBody = Buffer.from(
      JSON.stringify({ staffId: "attacker-staff", companySlug: "empresa", nonce: "x", issuedAt: Date.now() }),
      "utf8",
    ).toString("base64url");
    const tampered = `${tamperedBody}.${originalSignature}`;

    const result = verifyOAuthState(tampered, SECRET);

    expect(result.valid).toBe(false);
    expect(originalBody).not.toBe(tamperedBody);
  });

  it("rejects a malformed token", () => {
    expect(verifyOAuthState("not-a-valid-token", SECRET)).toEqual({
      valid: false,
      reason: "MALFORMED",
    });
  });

  it("rejects an expired state", () => {
    const token = createOAuthState({ staffId: "staff-1", companySlug: "empresa" }, SECRET);
    const [body] = token.split(".") as [string, string];
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      issuedAt: number;
    } & Record<string, unknown>;
    payload.issuedAt = Date.now() - 11 * 60 * 1000; // 11 min atrás, além do TTL de 10 min

    const expiredBody = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    // Reassina com o mesmo segredo pra isolar o teste no caminho de expiração, não de assinatura.
    const signature = createHmac("sha256", SECRET).update(expiredBody).digest("base64url");
    const expiredToken = `${expiredBody}.${signature}`;

    expect(verifyOAuthState(expiredToken, SECRET)).toEqual({ valid: false, reason: "EXPIRED" });
  });
});
