const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

// calendar.events (não o escopo amplo de gerenciar todos os calendars do usuário) +
// openid/email só pra identificar qual conta Google foi conectada na UI — reduz o
// blast radius de um refresh token vazado ao mínimo necessário.
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events openid email";

export interface BuildAuthorizationUrlInput {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function buildGoogleAuthorizationUrl({
  clientId,
  redirectUri,
  state,
}: BuildAuthorizationUrlInput): string {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  // access_type=offline é o que faz o Google emitir refresh_token; prompt=consent força
  // reemissão mesmo se o staff já tinha autorizado antes (senão o Google só devolve
  // refresh_token na PRIMEIRA autorização de cada app, e reconectar depois de desconectar
  // ficaria quebrado).
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export interface ExchangeCodeInput {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  scope: string;
}

interface GoogleTokenApiResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCodeForTokens(input: ExchangeCodeInput): Promise<GoogleTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao trocar code por token no Google (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as GoogleTokenApiResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresInSeconds: data.expires_in,
    scope: data.scope,
  };
}

export interface RefreshAccessTokenInput {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface RefreshedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
}

export async function refreshAccessToken(
  input: RefreshAccessTokenInput,
): Promise<RefreshedAccessToken> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: input.refreshToken,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao renovar access token no Google (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar e-mail da conta Google (${response.status}).`);
  }

  const data = (await response.json()) as { email?: string };
  if (!data.email) {
    throw new Error("Resposta do Google não incluiu e-mail — verifique o escopo 'email' solicitado.");
  }
  return data.email;
}
