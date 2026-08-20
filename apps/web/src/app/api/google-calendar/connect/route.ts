import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@scheduling-saas/database";
import { buildGoogleAuthorizationUrl, createOAuthState } from "@scheduling-saas/calendar";
import { auth } from "@/auth";
import {
  getAuthSecret,
  getGoogleCalendarRedirectUri,
  getGoogleOAuthConfig,
} from "@/lib/google-calendar/env";

export const OAUTH_STATE_COOKIE = "gcal_oauth_state";

// Decisão 1 do design de Calendar no PRD: só o próprio staff conecta a própria agenda —
// nunca o Owner em nome de outra pessoa. Por isso essa rota resolve o staffId a partir
// da sessão atual (companyId+userId), nunca de um staffId recebido por querystring.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const companySlug = request.nextUrl.searchParams.get("companySlug");
  if (!companySlug) {
    return NextResponse.json({ error: "companySlug é obrigatório." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company || company.deletedAt) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const staff = await prisma.staffProfile.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: session.user.id } },
  });
  if (!staff) {
    return NextResponse.json(
      { error: "Você não é um profissional cadastrado nesta empresa." },
      { status: 403 },
    );
  }

  let authorizationUrl: string;
  let state: string;
  try {
    const { clientId } = getGoogleOAuthConfig();
    state = createOAuthState({ staffId: staff.id, companySlug }, getAuthSecret());
    authorizationUrl = buildGoogleAuthorizationUrl({
      clientId,
      redirectUri: getGoogleCalendarRedirectUri(),
      state,
    });
  } catch (error) {
    // Config ausente/inválida (deploy mal configurado) — nunca deixa vazar um 500 cru,
    // mesmo padrão de erro amigável usado em todo o resto do app.
    const message = error instanceof Error ? error.message : "Erro de configuração.";
    const url = new URL(`/app/${companySlug}/google-calendar`, request.url);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(authorizationUrl);
  // httpOnly + o mesmo valor mandado como `state` pro Google — o callback exige que os
  // dois batam byte-a-byte (double-submit cookie), defesa real contra CSRF (ver
  // packages/calendar/src/oauth-state.ts).
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google-calendar",
  });
  return response;
}
