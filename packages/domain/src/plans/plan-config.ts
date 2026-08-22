// Tipo próprio (não importado de @scheduling-saas/database) — mesmo padrão já usado em
// booking/status.ts: packages/domain não depende do Prisma Client gerado, só espelha os
// valores do enum PlanTier do schema.
export type PlanTier = "FREE" | "STARTER" | "PRO";

export type PlanFeature = string;

export interface PlanConfig {
  priceInCents: number;
  maxStaff: number | null; // null = sem limite
  maxBookingsPerMonth: number | null; // null = sem limite
  mpPreapprovalPlanId: string | null; // preenchido depois de criar o plano de verdade no Mercado Pago
  features: readonly PlanFeature[];
}

// Dias de trial ao criar uma empresa nova (ver createCompanyAction) — trialEndsAt = now + isso.
export const TRIAL_DAYS = 14;

// PLACEHOLDERS — preço/limites/features reais são decisão de negócio, ainda não tomada
// (ver "Análise de Concorrência - Margem e Completude" e o plano de implementação). Nada no
// app hoje chama planIncludesFeature()/isWithinPlanLimit() pra bloquear uma feature já
// existente (Google Calendar sync, agendamento sem conta, etc. continuam livres pra todo
// mundo) — trocar os números aqui não tem efeito até alguém decidir aplicar o gating em algum
// ponto real, e não exige migration (enum + config, não tabela).
export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  FREE: {
    priceInCents: 0,
    maxStaff: 1,
    maxBookingsPerMonth: 50,
    mpPreapprovalPlanId: null,
    features: [],
  },
  STARTER: {
    priceInCents: 4990,
    maxStaff: 5,
    maxBookingsPerMonth: null,
    mpPreapprovalPlanId: null,
    features: [],
  },
  PRO: {
    priceInCents: 9990,
    maxStaff: null,
    maxBookingsPerMonth: null,
    mpPreapprovalPlanId: null,
    features: [],
  },
};
