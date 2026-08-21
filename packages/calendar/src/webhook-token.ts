import { createHmac, timingSafeEqual } from "node:crypto";

// Google ecoa esse token em todo POST do webhook (header X-Goog-Channel-Token)
// — é a única forma de confirmar que a notificação realmente veio do canal que
// a gente criou pra essa conexão, e não de alguém batendo direto na rota.
// Diferente do state do OAuth, não precisa de nonce/expiração: o token vive
// junto do canal (até ~1 mês) e não é single-use.
export function createWatchChannelToken(connectionId: string, secret: string): string {
  return createHmac("sha256", secret).update(connectionId).digest("base64url");
}

export function verifyWatchChannelToken(token: string, connectionId: string, secret: string): boolean {
  const expected = createWatchChannelToken(connectionId, secret);
  const tokenBuffer = Buffer.from(token, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}
