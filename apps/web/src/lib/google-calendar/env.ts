import "server-only";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados.");
  }
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error(
      "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY precisa ter 64 caracteres em hex (32 bytes) — gerar com: openssl rand -hex 32.",
    );
  }

  return { clientId, clientSecret, encryptionKey };
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurada.");
  }
  return secret;
}

// Fixo em vez de configurável: precisa bater exatamente com o redirect URI cadastrado
// nas credenciais OAuth do Google Cloud Console pro client_id/client_secret usados.
export function getGoogleCalendarRedirectUri(): string {
  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    throw new Error("AUTH_URL não configurada.");
  }
  return `${authUrl}/api/google-calendar/callback`;
}
