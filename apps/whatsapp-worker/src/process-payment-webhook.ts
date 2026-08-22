import { prisma } from "@scheduling-saas/database";
import {
  getBookingRemindersQueue,
  getGoogleCalendarSyncQueue,
  getNotificationsQueue,
  type PaymentWebhookJobData,
} from "@scheduling-saas/queue";
import { assertAuthoritativePaymentAmount, getPayment } from "@scheduling-saas/payments";
import { getMercadoPagoEnv } from "./mercadopago-env";

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 30_000 },
};

const REMINDER_OFFSETS: { label: "24h" | "2h"; minutesBefore: number }[] = [
  { label: "24h", minutesBefore: 24 * 60 },
  { label: "2h", minutesBefore: 2 * 60 },
];

// Mesmos 3 efeitos colaterais que confirmBookingAction/confirmGuestBookingAction disparam
// inline pra um booking sem pagamento (apps/web/src/lib/notifications/
// enqueue-booking-notifications.ts + google-calendar/enqueue-booking-sync.ts) — duplicados
// aqui porque o worker não pode importar código de apps/web (apps separados; só packages/*
// são compartilhados entre os dois). Mesmo precedente de duplicação inline já usado em
// reconciliation.ts.
async function triggerPostConfirmationSideEffects(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });
  if (!booking) return;

  if (booking.customerPhoneSnapshot) {
    const log = await prisma.notificationLog.create({
      data: {
        companyId: booking.companyId,
        bookingId: booking.id,
        recipientUserId: booking.customer.userId,
        channel: "WHATSAPP",
        type: "BOOKING_CONFIRMATION",
        destination: booking.customerPhoneSnapshot,
        status: "QUEUED",
      },
    });
    await getNotificationsQueue().add(
      "send-notification",
      { notificationLogId: log.id },
      DEFAULT_JOB_OPTIONS,
    );

    const now = Date.now();
    for (const offset of REMINDER_OFFSETS) {
      const fireAt = booking.startsAt.getTime() - offset.minutesBefore * 60_000;
      const delay = fireAt - now;
      if (delay <= 0) continue;
      await getBookingRemindersQueue().add(
        "booking-reminder",
        {
          bookingId: booking.id,
          expectedStartsAtIso: booking.startsAt.toISOString(),
          reminderLabel: offset.label,
        },
        { ...DEFAULT_JOB_OPTIONS, delay },
      );
    }
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { staffId: booking.staffId },
    select: { id: true },
  });
  if (connection) {
    await getGoogleCalendarSyncQueue().add("sync-booking-event", { bookingId }, DEFAULT_JOB_OPTIONS);
  }
}

// Nunca confia no corpo do webhook — sempre busca o pagamento real via getPayment() antes de
// agir (mesmo princípio já usado no sync do Google Calendar: o webhook é só um aviso "algo
// mudou"). O payment id vira conhecido só depois que o cliente paga; até lá, o Payment local só
// tem mpPreferenceId — por isso o link de volta é sempre external_reference (= bookingId), não
// mpPaymentId, na primeira entrega.
export async function processPaymentWebhookJob(data: PaymentWebhookJobData): Promise<void> {
  const { accessToken } = getMercadoPagoEnv();
  const mpPayment = await getPayment({ accessToken }, data.mpPaymentId);

  if (!mpPayment.external_reference) {
    console.error(`[payment-webhook] pagamento ${mpPayment.id} sem external_reference — ignorado`);
    return;
  }

  const payment = await prisma.payment.findUnique({ where: { bookingId: mpPayment.external_reference } });
  if (!payment) {
    console.error(`[payment-webhook] nenhum Payment encontrado pro booking ${mpPayment.external_reference}`);
    return;
  }

  // Idempotência: um Payment já resolvido (por uma entrega anterior do webhook, ou pela
  // reconciliação de expiração) não é reprocessado — retorna sem efeito.
  if (payment.status !== "PENDING") {
    return;
  }

  assertAuthoritativePaymentAmount(payment.amountInCents, Math.round(mpPayment.transaction_amount * 100));

  const receivedFields = {
    mpPaymentId: String(mpPayment.id),
    mpPaymentMethod: mpPayment.payment_method_id,
    mpStatusDetail: mpPayment.status_detail,
  };

  if (mpPayment.status === "approved") {
    // updateMany com o filtro status="PENDING" no WHERE (não só no bookingId) é a defesa
    // contra a corrida com a varredura de expiração (reconcileExpiredPayments): se as duas
    // tentarem resolver o mesmo Payment ao mesmo tempo, só uma delas afeta uma linha —
    // count 0 significa que a outra já venceu, e esta simplesmente não faz nada.
    const { count } = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { ...receivedFields, status: "APPROVED", approvedAt: new Date() },
    });
    if (count === 0) return;

    await prisma.$transaction([
      prisma.booking.update({ where: { id: payment.bookingId }, data: { status: "CONFIRMED" } }),
      prisma.bookingEvent.create({
        data: { bookingId: payment.bookingId, companyId: payment.companyId, type: "BOOKING_CONFIRMED" },
      }),
    ]);
    await triggerPostConfirmationSideEffects(payment.bookingId);
    return;
  }

  if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
    const { count } = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { ...receivedFields, status: mpPayment.status === "rejected" ? "REJECTED" : "CANCELLED" },
    });
    if (count === 0) return;

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
      prisma.bookingEvent.create({
        data: { bookingId: payment.bookingId, companyId: payment.companyId, type: "BOOKING_CANCELLED" },
      }),
    ]);
    return;
  }

  // pending/in_process/etc — nada a confirmar ainda, só grava o mpPaymentId pra próximas
  // consultas/reconciliação poderem buscar o pagamento direto por ele.
  await prisma.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: receivedFields,
  });
}
