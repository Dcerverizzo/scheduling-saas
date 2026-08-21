import { decryptToken, refreshAccessToken } from "@scheduling-saas/calendar";
import type { GoogleCalendarConnection } from "@scheduling-saas/database";

export interface GoogleOAuthEnv {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
}

export function getGoogleOAuthEnv(): GoogleOAuthEnv {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !encryptionKey) {
    throw new Error(
      "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY não configurados no worker.",
    );
  }
  return { clientId, clientSecret, encryptionKey };
}

// Compartilhado entre outbound e inbound — os dois precisam de um access token
// válido antes de chamar a Calendar API, e nenhum dos dois guarda o access
// token em si (só o refresh token cifrado), então renova a cada job.
export async function getValidAccessToken(connection: GoogleCalendarConnection): Promise<string> {
  const { clientId, clientSecret, encryptionKey } = getGoogleOAuthEnv();
  const refreshToken = decryptToken(connection.refreshToken, encryptionKey);
  const { accessToken } = await refreshAccessToken({ refreshToken, clientId, clientSecret });
  return accessToken;
}
