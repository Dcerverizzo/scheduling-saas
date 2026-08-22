import { NextResponse, type NextRequest } from "next/server";
import { verifyMercadoPagoSignature } from "@scheduling-saas/payments";
import { getPaymentWebhookQueue } from "@scheduling-saas/queue";
import { getMercadoPagoConfig } from "@/lib/payments/env";
import { checkRateLimit } from "@/lib/rate-limit";

// Nunca processa a mudança aqui — só confirma a assinatura e enfileira pro worker buscar o
// pagamento real (getPayment) antes de agir. Mesma filosofia do webhook do Google Calendar:
// o corpo da notificação é só um aviso "algo mudou", nunca a fonte de verdade. Responde 200
// rápido mesmo quando não há nada a enfileirar — o Mercado Pago reenvia agressivamente em erro.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit({ key: `mp-webhook-payment:${ip}`, limit: 60, windowSeconds: 60 });
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
    // Sem credencial configurada — não dá pra verificar assinatura nenhuma, então não dá pra
    // confiar em nada que chegue aqui. 200 pra parar o retry (não é um erro transitório).
    return new NextResponse(null, { status: 200 });
  }

  const isValid = verifyMercadoPagoSignature({ signatureHeader, requestId, dataId, secret: webhookSecret });
  if (!isValid) {
    return new NextResponse(null, { status: 403 });
  }

  await getPaymentWebhookQueue().add(
    "process-payment-webhook",
    { mpPaymentId: dataId },
    { attempts: 3, backoff: { type: "exponential", delay: 30_000 } },
  );

  return new NextResponse(null, { status: 200 });
}
