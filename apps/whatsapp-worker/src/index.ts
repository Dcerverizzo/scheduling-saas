import "./env";
import { Worker } from "bullmq";
import {
  BOOKING_REMINDERS_QUEUE,
  GOOGLE_CALENDAR_INBOUND_SYNC_QUEUE,
  GOOGLE_CALENDAR_SYNC_QUEUE,
  NOTIFICATIONS_QUEUE,
  PAYMENT_WEBHOOK_QUEUE,
  SUBSCRIPTION_WEBHOOK_QUEUE,
  redisConnection,
} from "@scheduling-saas/queue";
import type {
  BookingReminderJobData,
  GoogleCalendarInboundSyncJobData,
  GoogleCalendarSyncJobData,
  PaymentWebhookJobData,
  SendNotificationJobData,
  SubscriptionWebhookJobData,
} from "@scheduling-saas/queue";
import { ConsoleNotificationProvider, type NotificationProvider } from "@scheduling-saas/notifications";
import { sendAndLog } from "./notification-sender";
import { processBookingReminderJob } from "./process-booking-reminder";
import { processGoogleCalendarSyncJob } from "./google-calendar-sync";
import { syncInboundAvailability } from "./google-calendar-inbound-sync";
import { processPaymentWebhookJob } from "./process-payment-webhook";
import { processSubscriptionWebhookJob } from "./process-subscription-webhook";
import {
  reconcileExpiredPayments,
  reconcileGoogleCalendarConnections,
  reconcileMissingConfirmations,
  reconcilePlatformSubscriptions,
} from "./reconciliation";
import { startWhatsAppConnection } from "./whatsapp-connection";
import { BaileysNotificationProvider } from "./baileys-notification-provider";

// "baileys" é o default de produção (item do Step 8 do PRD: substituir o
// ConsoleNotificationProvider). Dev local usa WHATSAPP_PROVIDER=console no .env
// pra não tentar abrir uma conexão/QR de verdade em toda sessão de desenvolvimento.
async function resolveProvider(): Promise<NotificationProvider> {
  const mode = process.env.WHATSAPP_PROVIDER ?? "baileys";
  if (mode === "console") {
    console.log("[whatsapp-worker] WHATSAPP_PROVIDER=console — usando ConsoleNotificationProvider");
    return new ConsoleNotificationProvider();
  }

  console.log("[whatsapp-worker] iniciando conexão com o WhatsApp (Baileys)...");
  const connection = await startWhatsAppConnection();
  return new BaileysNotificationProvider(connection);
}

const provider = await resolveProvider();

const notificationsWorker = new Worker<SendNotificationJobData>(
  NOTIFICATIONS_QUEUE,
  async (job) => {
    await sendAndLog(job.data.notificationLogId, provider);
  },
  { connection: redisConnection },
);

const bookingRemindersWorker = new Worker<BookingReminderJobData>(
  BOOKING_REMINDERS_QUEUE,
  async (job) => {
    await processBookingReminderJob(job.data, provider);
  },
  { connection: redisConnection },
);

const googleCalendarSyncWorker = new Worker<GoogleCalendarSyncJobData>(
  GOOGLE_CALENDAR_SYNC_QUEUE,
  async (job) => {
    await processGoogleCalendarSyncJob(job.data);
  },
  { connection: redisConnection },
);

const googleCalendarInboundSyncWorker = new Worker<GoogleCalendarInboundSyncJobData>(
  GOOGLE_CALENDAR_INBOUND_SYNC_QUEUE,
  async (job) => {
    await syncInboundAvailability(job.data.connectionId);
  },
  { connection: redisConnection },
);

const paymentWebhookWorker = new Worker<PaymentWebhookJobData>(
  PAYMENT_WEBHOOK_QUEUE,
  async (job) => {
    await processPaymentWebhookJob(job.data);
  },
  { connection: redisConnection },
);

const subscriptionWebhookWorker = new Worker<SubscriptionWebhookJobData>(
  SUBSCRIPTION_WEBHOOK_QUEUE,
  async (job) => {
    await processSubscriptionWebhookJob(job.data);
  },
  { connection: redisConnection },
);

for (const worker of [
  notificationsWorker,
  bookingRemindersWorker,
  googleCalendarSyncWorker,
  googleCalendarInboundSyncWorker,
  paymentWebhookWorker,
  subscriptionWebhookWorker,
]) {
  worker.on("completed", (job) => {
    console.log(`[whatsapp-worker] job ${job.id} (${worker.name}) concluído`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[whatsapp-worker] job ${job?.id} (${worker.name}) falhou:`, error.message);
  });
}

const RECONCILIATION_INTERVAL_MS = 5 * 60_000;
const reconciliationTimer = setInterval(() => {
  reconcileMissingConfirmations().catch((error) => {
    console.error("[whatsapp-worker] falha na reconciliação:", error);
  });
}, RECONCILIATION_INTERVAL_MS);

// Intervalo bem mais folgado que o de notificações — canal de watch do Google
// dura até ~1 mês, não precisa de granularidade de 5 min; isso aqui é rede de
// segurança pra webhook perdido, não o caminho principal de sync.
const GOOGLE_CALENDAR_RECONCILIATION_INTERVAL_MS = 30 * 60_000;
const googleCalendarReconciliationTimer = setInterval(() => {
  reconcileGoogleCalendarConnections().catch((error) => {
    console.error("[whatsapp-worker] falha na reconciliação do Google Calendar:", error);
  });
}, GOOGLE_CALENDAR_RECONCILIATION_INTERVAL_MS);

// Intervalo apertado (igual ao de confirmações) — um Payment PENDING expirado segura um slot
// real que um outro cliente poderia estar tentando reservar, diferente do canal de watch do
// Google (que só perde push notification, não trava nada).
const PAYMENT_RECONCILIATION_INTERVAL_MS = 5 * 60_000;
const paymentReconciliationTimer = setInterval(() => {
  reconcileExpiredPayments().catch((error) => {
    console.error("[whatsapp-worker] falha na reconciliação de pagamentos:", error);
  });
}, PAYMENT_RECONCILIATION_INTERVAL_MS);

// Mesmo intervalo folgado do Google Calendar — assinatura da SaaS não trava slot nenhum, é só
// rede de segurança pra webhook de preapproval perdido.
const SUBSCRIPTION_RECONCILIATION_INTERVAL_MS = 30 * 60_000;
const subscriptionReconciliationTimer = setInterval(() => {
  reconcilePlatformSubscriptions().catch((error) => {
    console.error("[whatsapp-worker] falha na reconciliação de assinaturas:", error);
  });
}, SUBSCRIPTION_RECONCILIATION_INTERVAL_MS);

console.log(
  "[whatsapp-worker] booted — consumindo filas 'notifications', 'booking-reminders', " +
    "'google-calendar-sync', 'google-calendar-inbound-sync', 'payment-webhook' e 'subscription-webhook'",
);

process.on("SIGTERM", () => {
  console.log("[whatsapp-worker] received SIGTERM, shutting down");
  clearInterval(reconciliationTimer);
  clearInterval(googleCalendarReconciliationTimer);
  clearInterval(paymentReconciliationTimer);
  clearInterval(subscriptionReconciliationTimer);
  Promise.all([
    notificationsWorker.close(),
    bookingRemindersWorker.close(),
    googleCalendarSyncWorker.close(),
    googleCalendarInboundSyncWorker.close(),
    paymentWebhookWorker.close(),
    subscriptionWebhookWorker.close(),
  ])
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
