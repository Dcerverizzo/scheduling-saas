import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// TTL generoso pro staff completar o consentimento na tela do Google sem o state expirar
// no meio do caminho, mas curto o suficiente pra não deixar um state velho reutilizável.
const STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthStatePayload {
  staffId: string;
  companySlug: string;
  nonce: string;
  issuedAt: number;
}

export type OAuthStateVerification =
  | { valid: true; payload: OAuthStatePayload }
  | { valid: false; reason: "MALFORMED" | "INVALID_SIGNATURE" | "EXPIRED" };

function signPayload(payload: OAuthStatePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

// Gera o token que vira tanto o `state` mandado pro Google quanto o valor do cookie
// httpOnly setado em /connect — o callback exige que os dois batam byte-a-byte
// (double-submit cookie), o que é a defesa real contra CSRF. A assinatura HMAC aqui
// é defesa em profundidade: impede que alguém forje um state válido sem conhecer o
// AUTH_SECRET, mesmo que de algum jeito só o parâmetro da URL fosse comprometido.
export function createOAuthState(
  input: { staffId: string; companySlug: string },
  secret: string,
): string {
  const payload: OAuthStatePayload = {
    staffId: input.staffId,
    companySlug: input.companySlug,
    nonce: randomUUID(),
    issuedAt: Date.now(),
  };
  return signPayload(payload, secret);
}

export function verifyOAuthState(token: string, secret: string): OAuthStateVerification {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "MALFORMED" };
  }
  const [body, signature] = parts as [string, string];

  const expectedSignature = createHmac("sha256", secret).update(body).digest("base64url");
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const signatureValid =
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer);
  if (!signatureValid) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }

  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true, payload };
}
