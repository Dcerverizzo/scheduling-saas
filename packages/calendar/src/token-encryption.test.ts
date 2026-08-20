import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./token-encryption";

const KEY = "0".repeat(64); // 32 bytes em hex
const OTHER_KEY = "1".repeat(64);

describe("encryptToken / decryptToken", () => {
  it("round-trips the plaintext", () => {
    const ciphertext = encryptToken("refresh-token-value", KEY);

    expect(decryptToken(ciphertext, KEY)).toBe("refresh-token-value");
  });

  it("produces a different ciphertext on every call (random IV)", () => {
    const first = encryptToken("same-plaintext", KEY);
    const second = encryptToken("same-plaintext", KEY);

    expect(first).not.toBe(second);
  });

  it("fails to decrypt with the wrong key", () => {
    const ciphertext = encryptToken("refresh-token-value", KEY);

    expect(() => decryptToken(ciphertext, OTHER_KEY)).toThrow();
  });

  it("fails to decrypt a tampered ciphertext (auth tag catches it)", () => {
    const ciphertext = encryptToken("refresh-token-value", KEY);
    const [iv, authTag, body] = ciphertext.split(".") as [string, string, string];
    const tamperedBody = Buffer.from(body, "base64url");
    tamperedBody[0] = (tamperedBody[0] ?? 0) ^ 0xff;
    const tampered = `${iv}.${authTag}.${tamperedBody.toString("base64url")}`;

    expect(() => decryptToken(tampered, KEY)).toThrow();
  });

  it("rejects a key that isn't 32 bytes in hex", () => {
    expect(() => encryptToken("value", "not-hex-and-too-short")).toThrow();
  });

  it("rejects a malformed ciphertext", () => {
    expect(() => decryptToken("only-one-part", KEY)).toThrow();
  });
});
