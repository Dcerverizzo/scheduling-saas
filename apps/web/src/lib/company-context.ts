import "server-only";
import { notFound, redirect } from "next/navigation";
import { prisma, type Company, type CompanyMember } from "@scheduling-saas/database";
import { isSubscriptionBlocked, planIncludesFeature, type PlanFeature } from "@scheduling-saas/domain";
import { requireSession } from "@/lib/session";

// A "empresa ativa" não fica em sessão/cookie — o slug na URL já isola o tenant,
// e a membership é sempre reconferida fresca no banco (nunca confiada via JWT
// cacheado, que pode ficar desatualizado por até a duração da sessão).
export async function requireCompanyContext(companySlug: string): Promise<{
  userId: string;
  company: Company;
  membership: CompanyMember;
}> {
  const session = await requireSession();

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company || company.deletedAt) {
    notFound();
  }

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: session.user.id } },
  });
  if (!membership) {
    notFound();
  }

  return { userId: session.user.id, company, membership };
}

export async function requireCompanyOwner(companySlug: string) {
  const context = await requireCompanyContext(companySlug);
  if (context.membership.role !== "OWNER") {
    notFound();
  }
  return context;
}

// Scaffolding pronto pra quando o gating de plano for de fato aplicado em alguma rota — ainda
// não é chamado em lugar nenhum do app hoje. Números/tiers reais de plano ainda não foram
// decididos (ver packages/domain/src/plans/plan-config.ts), então nenhuma feature já existente
// (sync do Google Calendar, agendamento sem conta, etc.) está bloqueada por plano. Mesmo
// formato de requireCompanyOwner — nunca `if (company.plan === "PRO")` espalhado pelo código.
export async function requireCompanyPlanFeature(companySlug: string, feature: PlanFeature) {
  const context = await requireCompanyContext(companySlug);
  const { company } = context;

  const blocked =
    isSubscriptionBlocked(company.subscriptionStatus, company.trialEndsAt, new Date()) ||
    !planIncludesFeature(company.plan, feature);

  if (blocked) {
    redirect(`/app/${companySlug}/settings?upsell=${encodeURIComponent(feature)}`);
  }

  return context;
}
