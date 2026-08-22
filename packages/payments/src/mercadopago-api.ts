import type {
  MercadoPagoPreapprovalRequestBody,
  MercadoPagoPreferenceRequestBody,
} from "./checkout-preference";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

export class MercadoPagoApiError extends Error {
  readonly status: number;

  constructor(action: string, status: number, body: string) {
    super(`Falha ao ${action} no Mercado Pago (${status}): ${body}`);
    this.name = "MercadoPagoApiError";
    this.status = status;
  }
}

export interface MercadoPagoAuth {
  accessToken: string;
}

async function requestJson<T>(
  auth: MercadoPagoAuth,
  action: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${MERCADOPAGO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new MercadoPagoApiError(action, response.status, await response.text());
  }

  return (await response.json()) as T;
}

export interface CreatedPreference {
  id: string;
  init_point: string;
}

export async function createPreference(
  auth: MercadoPagoAuth,
  body: MercadoPagoPreferenceRequestBody,
): Promise<CreatedPreference> {
  return requestJson(auth, "criar preference", "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  external_reference: string | null;
  payment_method_id: string | null;
}

// Buscar o pagamento real é o passo que sempre precisa acontecer depois de um webhook — nunca
// confiar no status que veio no corpo da notificação (ver packages/payments/webhook-signature.ts).
export async function getPayment(auth: MercadoPagoAuth, paymentId: string): Promise<MercadoPagoPayment> {
  return requestJson(auth, "buscar pagamento", `/v1/payments/${encodeURIComponent(paymentId)}`);
}

export interface CreatePreapprovalPlanInput {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "months";
    transaction_amount: number;
    currency_id: string;
    free_trial?: { frequency: number; frequency_type: "days" | "months" };
  };
}

export interface CreatedPreapprovalPlan {
  id: string;
}

export async function createPreapprovalPlan(
  auth: MercadoPagoAuth,
  body: CreatePreapprovalPlanInput,
): Promise<CreatedPreapprovalPlan> {
  return requestJson(auth, "criar plano de assinatura", "/preapproval_plan", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface CreatedPreapproval {
  id: string;
  status: string;
}

export async function createPreapproval(
  auth: MercadoPagoAuth,
  body: MercadoPagoPreapprovalRequestBody,
): Promise<CreatedPreapproval> {
  return requestJson(auth, "criar assinatura", "/preapproval", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface MercadoPagoPreapproval {
  id: string;
  status: string;
  external_reference: string | null;
  payer_email?: string;
}

export async function getPreapproval(
  auth: MercadoPagoAuth,
  preapprovalId: string,
): Promise<MercadoPagoPreapproval> {
  return requestJson(auth, "buscar assinatura", `/preapproval/${encodeURIComponent(preapprovalId)}`);
}

// NÃO CONFIRMADO contra um sandbox real (sem credencial disponível neste ambiente — mesma
// limitação já documentada pro WhatsApp/Google). A resposta de createPreapproval() (sem
// card_token_id) pode ou não trazer um init_point pronto; a documentação também descreve o link
// de checkout de assinatura no formato abaixo. Construímos aqui como fallback determinístico —
// revisar contra a resposta real antes de ir pra produção, e preferir um init_point vindo da
// própria resposta da API se ele existir.
export function buildSubscriptionCheckoutUrl(preapprovalId: string): string {
  return `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${encodeURIComponent(preapprovalId)}`;
}
