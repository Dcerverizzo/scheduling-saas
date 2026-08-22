import {
  prisma,
  type CompanySubscription,
  type CompanySubscriptionStatus,
  type PlatformSubscriptionStatus,
} from "@scheduling-saas/database";
import type { SubscriptionWebhookJobData } from "@scheduling-saas/queue";
import { getPreapproval } from "@scheduling-saas/payments";
import { getMercadoPagoEnv } from "./mercadopago-env";

// NÃO CONFIRMADO contra a documentação oficial (mesma limitação já anotada em
// mercadopago-api.ts) — "authorized"/"paused"/"cancelled"/"pending" são os valores de status de
// preapproval citados durante o design; revisar contra um sandbox real antes de produção.
// Um status desconhecido lança (ver processSubscriptionWebhookJob) em vez de ser ignorado
// silenciosamente.
function mapPreapprovalStatus(
  mpStatus: string,
): { platform: PlatformSubscriptionStatus; company: CompanySubscriptionStatus } {
  switch (mpStatus) {
    case "authorized":
      return { platform: "AUTHORIZED", company: "ACTIVE" };
    case "paused":
      return { platform: "PAUSED", company: "PAST_DUE" };
    case "cancelled":
      return { platform: "CANCELLED", company: "CANCELED" };
    case "pending":
      return { platform: "PENDING", company: "INCOMPLETE" };
    default:
      throw new Error(`Status de preapproval desconhecido: "${mpStatus}"`);
  }
}

export async function processSubscriptionWebhookJob(data: SubscriptionWebhookJobData): Promise<void> {
  const { accessToken } = getMercadoPagoEnv();
  const preapproval = await getPreapproval({ accessToken }, data.mpPreapprovalId);

  const subscription = await findSubscription(preapproval.id, preapproval.external_reference);
  if (!subscription) {
    console.error(
      `[subscription-webhook] nenhuma CompanySubscription encontrada pra preapproval ${preapproval.id} (external_reference=${preapproval.external_reference})`,
    );
    return;
  }

  try {
    const mapped = mapPreapprovalStatus(preapproval.status);

    await prisma.$transaction([
      prisma.companySubscription.update({
        where: { id: subscription.id },
        data: {
          mpPreapprovalId: preapproval.id,
          payerEmail: preapproval.payer_email ?? subscription.payerEmail,
          status: mapped.platform,
          lastSyncedAt: new Date(),
          lastErrorAt: null,
          lastErrorMessage: null,
        },
      }),
      // plan só sobe pro tier assinado quando a assinatura fica ACTIVE — um PAST_DUE/CANCELED
      // não rebaixa Company.plan sozinho, o bloqueio de acesso vem de subscriptionStatus via
      // isSubscriptionBlocked() (packages/domain/src/plans/plan-policies.ts), não do plan em si.
      prisma.company.update({
        where: { id: subscription.companyId },
        data: {
          subscriptionStatus: mapped.company,
          plan: mapped.company === "ACTIVE" ? subscription.planTier : undefined,
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar assinatura.";
    await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: { lastErrorAt: new Date(), lastErrorMessage: message },
    });
    // Propaga pro BullMQ aplicar retry/backoff — mesmo padrão do sync do Google Calendar.
    throw error;
  }
}

async function findSubscription(
  mpPreapprovalId: string,
  externalReference: string | null,
): Promise<CompanySubscription | null> {
  const byPreapprovalId = await prisma.companySubscription.findUnique({ where: { mpPreapprovalId } });
  if (byPreapprovalId) return byPreapprovalId;

  if (!externalReference) return null;
  return prisma.companySubscription.findUnique({ where: { companyId: externalReference } });
}
