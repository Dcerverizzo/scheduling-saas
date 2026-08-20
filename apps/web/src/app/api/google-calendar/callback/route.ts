import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@scheduling-saas/database";
import {
  encryptToken,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  verifyOAuthState,
} from "@scheduling-saas/calendar";
import { auth } from "@/auth";
import {
  getAuthSecret,
  getGoogleCalendarRedirectUri,
  getGoogleOAuthConfig,
} from "@/lib/google-calendar/env";
import { OAUTH_STATE_COOKIE } from "../connect/route";

function redirectToCalendarPage(request: NextRequest, companySlug: string, error?: string) {
  const url = new URL(`/app/${companySlug}/google-calendar`, request.url);
  if (error) url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const params = request.nextUrl.searchParams;
  const stateParam = params.get("state");
  const code = params.get("code");
  const googleError = params.get("error");
  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // CSRF (double-submit cookie): o state que voltou do Google precisa bater byte-a-byte
  // com o cookie setado em /connect — sem isso, alguém com o próprio "code" válido
  // poderia linkar a conta dele à agenda de uma vítima logada (login CSRF). Comparação
  // de tamanho primeiro evita o throw do timingSafeEqual em buffers de tamanho diferente.
  const stateMatchesCookie =
    !!stateParam &&
    !!stateCookie &&
    stateParam.length === stateCookie.length &&
    timingSafeEqual(Buffer.from(stateParam), Buffer.from(stateCookie));

  if (!stateMatchesCookie || !stateParam) {
    return NextResponse.json(
      { error: "State inválido ou expirado — tente conectar novamente." },
      { status: 400 },
    );
  }

  const verification = verifyOAuthState(stateParam, getAuthSecret());
  if (!verification.valid) {
    return NextResponse.json({ error: `State inválido (${verification.reason}).` }, { status: 400 });
  }
  const { staffId, companySlug } = verification.payload;

  if (googleError || !code) {
    return redirectToCalendarPage(request, companySlug, googleError ?? "missing_code");
  }

  const staff = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  // O state já garante isso via CSRF, mas reconferir aqui é defesa em profundidade —
  // mesmo padrão de nunca confiar só no ID vindo do cliente (item 99-106 do PRD).
  if (!staff || staff.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Você não tem permissão para conectar essa agenda." },
      { status: 403 },
    );
  }

  const { clientId, clientSecret, encryptionKey } = getGoogleOAuthConfig();

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri: getGoogleCalendarRedirectUri(),
    });

    if (!tokens.refreshToken) {
      // Acontece quando o Google não reemite refresh_token — mitigado ao pedir
      // prompt=consent em /connect, mas se ainda assim vier vazio não dá pra persistir
      // uma conexão que não consegue renovar o access token depois.
      return redirectToCalendarPage(request, companySlug, "missing_refresh_token");
    }

    const googleAccountEmail = await fetchGoogleAccountEmail(tokens.accessToken);
    const encryptedRefreshToken = encryptToken(tokens.refreshToken, encryptionKey);

    await prisma.googleCalendarConnection.upsert({
      where: { staffId },
      create: {
        companyId: staff.companyId,
        staffId,
        googleAccountEmail,
        calendarId: "primary",
        refreshToken: encryptedRefreshToken,
        scope: tokens.scope,
        status: "CONNECTED",
      },
      update: {
        googleAccountEmail,
        calendarId: "primary",
        refreshToken: encryptedRefreshToken,
        scope: tokens.scope,
        status: "CONNECTED",
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });

    return redirectToCalendarPage(request, companySlug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao conectar.";
    return redirectToCalendarPage(request, companySlug, message);
  }
}
