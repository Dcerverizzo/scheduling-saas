import { NextResponse, type NextRequest } from "next/server";
import { verifyMercadoPagoSignature } from "@scheduling-saas/payments";
import { getSubscriptionWebhookQueue } from "@scheduling-saas/queue";
import { getMercadoPagoConfig } from "@/lib/payments/env";
import { checkRateLimit } from "@/lib/rate-limit";

// Rota separada da de pagamento de booking (mesmo formato de verificação, fila e worker
// diferentes) — mantém as duas features desacopladas ponta a ponta, ver plano de
// implementação. Mesma filosofia: só valida e enfileira, nunca processa aqui.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit({ key: `mp-webhook-subscription:${ip}`, limit: 60, windowSeconds: 60 });
  if (!allowed) {
    return new NextResponse(null, { status: 429 });
  }

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const dataIdFromQuery = request.nextUrl.searchParams.get("data.id");

  let body: { data?: { id?: string } } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const dataId = dataIdFromQuery ?? body?.data?.id;

  if (!signatureHeader || !requestId || !dataId) {
    return new NextResponse(null, { status: 400 });
  }

  let webhookSecret: string;
  try {
    ({ webhookSecret } = getMercadoPagoConfig());
  } catch {
    return new NextResponse(null, { status: 200 });
  }

  const isValid = verifyMercadoPagoSignature({ signatureHeader, requestId, dataId, secret: webhookSecret });
  if (!isValid) {
    return new NextResponse(null, { status: 403 });
  }

  await getSubscriptionWebhookQueue().add(
    "process-subscription-webhook",
    { mpPreapprovalId: dataId },
    { attempts: 3, backoff: { type: "exponential", delay: 30_000 } },
  );

  return new NextResponse(null, { status: 200 });
}
