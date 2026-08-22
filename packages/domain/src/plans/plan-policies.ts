import { PLAN_CONFIG, type PlanFeature, type PlanTier } from "./plan-config";

// Mesmo padrão de tipo próprio de plan-config.ts — espelha o enum CompanySubscriptionStatus do
// Prisma sem importar o client gerado.
export type CompanySubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";

export function planIncludesFeature(plan: PlanTier, feature: PlanFeature): boolean {
  return PLAN_CONFIG[plan].features.includes(feature);
}

export function isWithinPlanLimit(
  plan: PlanTier,
  kind: "staff" | "bookingsPerMonth",
  currentCount: number,
): boolean {
  const limit = kind === "staff" ? PLAN_CONFIG[plan].maxStaff : PLAN_CONFIG[plan].maxBookingsPerMonth;
  if (limit === null) {
    return true;
  }
  return currentCount < limit;
}

// TRIALING só libera enquanto trialEndsAt não passou. trialEndsAt=null com status TRIALING é
// um estado que não deveria existir na prática (toda empresa nasce com trialEndsAt calculado —
// ver TRIAL_DAYS em plan-config.ts), mas se acontecer (dado legado, bug em outro lugar) o
// default é bloquear, não liberar de graça indefinidamente — fail closed, consistente com a
// prioridade #2 do PRD (segurança antes de conveniência). ACTIVE nunca bloqueia; PAST_DUE/
// CANCELED/INCOMPLETE sempre bloqueiam. Sem período de graça pós-PAST_DUE ainda — decisão de
// negócio em aberto, fácil de ajustar aqui depois (função pura, um lugar só).
export function isSubscriptionBlocked(
  status: CompanySubscriptionStatus,
  trialEndsAt: Date | null,
  now: Date,
): boolean {
  if (status === "ACTIVE") {
    return false;
  }
  if (status === "TRIALING") {
    return trialEndsAt === null || now > trialEndsAt;
  }
  return true;
}
