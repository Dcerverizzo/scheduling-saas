import "server-only";
import { prisma, type Booking, type Company } from "@scheduling-saas/database";
import { DomainError } from "@scheduling-saas/domain";
import {
  buildBookingPreferencePayload,
  calculateDepositAmountInCents,
  createPreference,
  MercadoPagoApiError,
} from "@scheduling-saas/payments";
import { getMercadoPagoConfig } from "./env";

// Tempo que um booking PENDING segura o slot esperando pagamento antes da reconciliação
// periódica (apps/whatsapp-worker/src/reconciliation.ts) cancelar — ver Payment.expiresAt.
export const PAYMENT_EXPIRY_MINUTES = 30;

export interface CreateBookingPaymentResult {
  initPoint: string;
}

// Chamado por confirmBookingAction/confirmGuestBookingAction logo depois de createBooking()
// devolver um booking PENDING (empresa com paymentRequirement != NONE). Monta a preference no
// Mercado Pago, grava o Payment (fonte de verdade local do que foi cobrado) e devolve o
// init_point pra redirecionar o cliente.
export async function createBookingPayment(
  booking: Booking,
  company: Company,
): Promise<CreateBookingPaymentResult> {
  if (company.paymentRequirement === "NONE") {
    throw new DomainError("PAYMENT_SETUP_INVALID", "Esta empresa não exige pagamento no agendamento.");
  }

  const amountInCents =
    company.paymentRequirement === "FULL"
      ? booking.servicePriceSnapshot
      : calculateDepositAmountInCents(booking.servicePriceSnapshot, requireDepositPercentage(company));

  const baseUrl = requireAuthUrl();
  const successUrl = `${baseUrl}/${company.slug}/confirmar/pagamento?bookingId=${booking.id}`;

  const preferencePayload = buildBookingPreferencePayload({
    bookingId: booking.id,
    title: `${booking.serviceNameSnapshot} — ${company.name}`,
    amountInCents,
    successUrl,
    failureUrl: successUrl,
    pendingUrl: successUrl,
    notificationUrl: `${baseUrl}/api/mercadopago/webhook/payment`,
  });

  let preference;
  try {
    preference = await createPreference(getMercadoPagoConfig(), preferencePayload);
  } catch (error) {
    if (error instanceof MercadoPagoApiError) {
      throw new DomainError(
        "PAYMENT_INIT_FAILED",
        "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.",
      );
    }
    throw error;
  }

  await prisma.payment.create({
    data: {
      companyId: company.id,
      bookingId: booking.id,
      type: company.paymentRequirement === "FULL" ? "FULL" : "DEPOSIT",
      amountInCents,
      mpPreferenceId: preference.id,
      expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60_000),
    },
  });

  return { initPoint: preference.init_point };
}

function requireDepositPercentage(company: Company): number {
  if (company.depositPercentage === null) {
    throw new DomainError(
      "PAYMENT_SETUP_INVALID",
      "Configuração de sinal inválida — fale com a empresa antes de tentar de novo.",
    );
  }
  return company.depositPercentage;
}

function requireAuthUrl(): string {
  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    throw new DomainError("PAYMENT_INIT_FAILED", "Configuração de URL da aplicação ausente.");
  }
  return authUrl;
}
