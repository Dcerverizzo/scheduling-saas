import "server-only";

// Mesmo padrão de apps/web/src/lib/google-calendar/env.ts: leitura preguiçosa por request, não
// validação eager no boot (packages/config/src/env.ts) — pagamento é uma configuração OPCIONAL
// por empresa (paymentRequirement default NONE), a maioria das empresas nunca vai acionar isso,
// então não faz sentido derrubar o boot do app inteiro por falta de credencial do Mercado Pago.
export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
}

export function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!accessToken || !webhookSecret) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN/MERCADOPAGO_WEBHOOK_SECRET não configurados.");
  }

  return { accessToken, webhookSecret };
}
