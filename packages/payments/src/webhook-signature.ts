import { createHmac, timingSafeEqual } from "node:crypto";

// Mercado Pago manda o cabeçalho x-signature como pares "chave=valor" separados por vírgula
// (ex: "ts=1700000000000,v1=<hex>"). Formato documentado, não um JSON.
export interface MercadoPagoSignatureHeaderParts {
  ts: string;
  v1: string;
}

export function parseMercadoPagoSignatureHeader(header: string): MercadoPagoSignatureHeaderParts | null {
  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    parts[key] = value;
  }

  if (!parts.ts || !parts.v1) {
    return null;
  }
  return { ts: parts.ts, v1: parts.v1 };
}

// Template documentado do Mercado Pago: "id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;"
// — o id precisa estar em minúsculas no manifest mesmo que o id real usado pra buscar o
// pagamento não seja (mesma pegadinha documentada, replicada aqui de propósito).
export function buildMercadoPagoSignatureManifest(input: {
  dataId: string;
  requestId: string;
  ts: string;
}): string {
  return `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${input.ts};`;
}

// Verifica que a notificação webhook realmente veio do Mercado Pago (HMAC-SHA256 do manifest
// com o webhook secret, comparação em tempo constante). Nunca confiar no corpo do webhook sem
// isso passar — e mesmo passando, o status real ainda precisa ser buscado via getPayment()
// (o webhook é só um aviso "algo mudou", nunca a fonte de verdade do status).
export function verifyMercadoPagoSignature(input: {
  signatureHeader: string;
  requestId: string;
  dataId: string;
  secret: string;
}): boolean {
  const parsed = parseMercadoPagoSignatureHeader(input.signatureHeader);
  if (!parsed) {
    return false;
  }

  const manifest = buildMercadoPagoSignatureManifest({
    dataId: input.dataId,
    requestId: input.requestId,
    ts: parsed.ts,
  });
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(parsed.v1, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
