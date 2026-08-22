import { centsToMercadoPagoAmount } from "./payment-amount";

export interface BookingPreferenceInput {
  bookingId: string;
  title: string;
  amountInCents: number;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
}

export interface MercadoPagoPreferenceRequestBody {
  items: Array<{ title: string; quantity: number; unit_price: number; currency_id: string }>;
  back_urls: { success: string; failure: string; pending: string };
  notification_url: string;
  external_reference: string;
  auto_return: "approved";
}

// external_reference é o bookingId — é assim que o webhook (que só manda o payment id) linka de
// volta pro nosso registro depois de buscar o pagamento real via getPayment().
export function buildBookingPreferencePayload(input: BookingPreferenceInput): MercadoPagoPreferenceRequestBody {
  return {
    items: [
      {
        title: input.title,
        quantity: 1,
        unit_price: centsToMercadoPagoAmount(input.amountInCents),
        currency_id: "BRL",
      },
    ],
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    notification_url: input.notificationUrl,
    external_reference: input.bookingId,
    auto_return: "approved",
  };
}

export interface SubscriptionPreapprovalInput {
  companyId: string;
  preapprovalPlanId: string;
  payerEmail: string;
  backUrl: string;
}

export interface MercadoPagoPreapprovalRequestBody {
  preapproval_plan_id: string;
  payer_email: string;
  back_url: string;
  external_reference: string;
}

// Sem card_token_id nem status="authorized" de propósito — isso pede o fluxo de checkout POR
// REDIRECT (o Mercado Pago hospeda a entrada do cartão e devolve um init_point), evitando
// tokenizar cartão no nosso frontend. Ver nota em mercadopago-api.ts sobre a URL de checkout.
export function buildSubscriptionPreapprovalPayload(
  input: SubscriptionPreapprovalInput,
): MercadoPagoPreapprovalRequestBody {
  return {
    preapproval_plan_id: input.preapprovalPlanId,
    payer_email: input.payerEmail,
    back_url: input.backUrl,
    external_reference: input.companyId,
  };
}
