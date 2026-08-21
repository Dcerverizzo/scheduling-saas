import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@scheduling-saas/database";
import { verifyWatchChannelToken } from "@scheduling-saas/calendar";
import { getAuthSecret } from "@/lib/google-calendar/env";
import { enqueueGoogleCalendarInboundSync } from "@/lib/google-calendar/enqueue-inbound-sync";

// Google não manda o QUE mudou aqui, só avisa "algo mudou nesse canal" — a
// rota só confirma a origem (X-Goog-Channel-Token, decisão 5 do design de
// Calendar no PRD) e enfileira o sync de verdade pro worker buscar via
// syncToken. Sempre responde rápido: o Google reenvia se demorar/der erro, o
// que só geraria trabalho duplicado (o worker já é idempotente por design).
export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceState = request.headers.get("x-goog-resource-state");

  if (!channelId || !channelToken) {
    return new NextResponse(null, { status: 400 });
  }

  const connection = await prisma.googleCalendarConnection.findFirst({
    where: { watchChannelId: channelId },
    select: { id: true },
  });
  if (!connection) {
    // Canal que não reconhecemos mais (desconectado, ou renovado com outro
    // id) — 200 pra o Google parar de reenviar; não é uma falha nossa.
    return new NextResponse(null, { status: 200 });
  }

  if (!verifyWatchChannelToken(channelToken, connection.id, getAuthSecret())) {
    return new NextResponse(null, { status: 403 });
  }

  // "sync" é só o handshake de confirmação do canal na criação — sem mudança
  // real pra buscar ainda.
  if (resourceState && resourceState !== "sync") {
    await enqueueGoogleCalendarInboundSync(connection.id);
  }

  return new NextResponse(null, { status: 200 });
}
