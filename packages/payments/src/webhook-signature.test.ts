import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildMercadoPagoSignatureManifest,
  parseMercadoPagoSignatureHeader,
  verifyMercadoPagoSignature,
} from "./webhook-signature";

function signManifest(manifest: string, secret: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

function buildValidHeader(input: { dataId: string; requestId: string; ts: string; secret: string }): string {
  const manifest = buildMercadoPagoSignatureManifest(input);
  const v1 = signManifest(manifest, input.secret);
  return `ts=${input.ts},v1=${v1}`;
}

describe("parseMercadoPagoSignatureHeader", () => {
  it("parses ts and v1 from the comma-separated header", () => {
    expect(parseMercadoPagoSignatureHeader("ts=123,v1=abc")).toEqual({ ts: "123", v1: "abc" });
  });

  it("tolerates extra whitespace around keys/values", () => {
    expect(parseMercadoPagoSignatureHeader(" ts = 123 , v1 = abc ")).toEqual({ ts: "123", v1: "abc" });
  });

  it("returns null when ts is missing", () => {
    expect(parseMercadoPagoSignatureHeader("v1=abc")).toBeNull();
  });

  it("returns null when v1 is missing", () => {
    expect(parseMercadoPagoSignatureHeader("ts=123")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseMercadoPagoSignatureHeader("not-a-real-header")).toBeNull();
  });
});

describe("buildMercadoPagoSignatureManifest", () => {
  it("lowercases the data id per Mercado Pago's documented template", () => {
    const manifest = buildMercadoPagoSignatureManifest({
      dataId: "ABC123",
      requestId: "req-1",
      ts: "1700000000",
    });
    expect(manifest).toBe("id:abc123;request-id:req-1;ts:1700000000;");
  });
});

describe("verifyMercadoPagoSignature", () => {
  const secret = "webhook-secret";

  it("accepts a correctly signed header", () => {
    const header = buildValidHeader({ dataId: "123456789", requestId: "req-1", ts: "1700000000", secret });
    expect(
      verifyMercadoPagoSignature({ signatureHeader: header, requestId: "req-1", dataId: "123456789", secret }),
    ).toBe(true);
  });

  it("accepts even when the caller passes dataId in a different case than the signed manifest", () => {
    const header = buildValidHeader({ dataId: "abc123", requestId: "req-1", ts: "1700000000", secret });
    expect(
      verifyMercadoPagoSignature({ signatureHeader: header, requestId: "req-1", dataId: "ABC123", secret }),
    ).toBe(true);
  });

  it("rejects when the secret is wrong", () => {
    const header = buildValidHeader({ dataId: "123456789", requestId: "req-1", ts: "1700000000", secret });
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header,
        requestId: "req-1",
        dataId: "123456789",
        secret: "wrong-secret",
      }),
    ).toBe(false);
  });

  it("rejects when the dataId doesn't match what was signed", () => {
    const header = buildValidHeader({ dataId: "123456789", requestId: "req-1", ts: "1700000000", secret });
    expect(
      verifyMercadoPagoSignature({ signatureHeader: header, requestId: "req-1", dataId: "999999999", secret }),
    ).toBe(false);
  });

  it("rejects when the requestId doesn't match what was signed", () => {
    const header = buildValidHeader({ dataId: "123456789", requestId: "req-1", ts: "1700000000", secret });
    expect(
      verifyMercadoPagoSignature({ signatureHeader: header, requestId: "req-2", dataId: "123456789", secret }),
    ).toBe(false);
  });

  it("rejects a malformed header", () => {
    expect(
      verifyMercadoPagoSignature({ signatureHeader: "garbage", requestId: "req-1", dataId: "123456789", secret }),
    ).toBe(false);
  });
});
