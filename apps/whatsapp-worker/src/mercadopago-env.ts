// Mesmo padrão de google-calendar-auth.ts (getGoogleOAuthEnv): leitura preguiçosa do
// process.env por job, erro simples se faltar — o worker já trata isso como falha de sync
// normal (status=ERROR + retry via BullMQ), não crash do processo inteiro.
export interface MercadoPagoEnv {
  accessToken: string;
  webhookSecret: string;
}

export function getMercadoPagoEnv(): MercadoPagoEnv {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!accessToken || !webhookSecret) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN/MERCADOPAGO_WEBHOOK_SECRET não configurados no worker.");
  }
  return { accessToken, webhookSecret };
}
