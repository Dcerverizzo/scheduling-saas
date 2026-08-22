import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const NOTIFICATIONS_QUEUE = "notifications";
export const BOOKING_REMINDERS_QUEUE = "booking-reminders";
export const GOOGLE_CALENDAR_SYNC_QUEUE = "google-calendar-sync";
export const GOOGLE_CALENDAR_INBOUND_SYNC_QUEUE = "google-calendar-inbound-sync";
export const PAYMENT_WEBHOOK_QUEUE = "payment-webhook";
export const SUBSCRIPTION_WEBHOOK_QUEUE = "subscription-webhook";

export interface SendNotificationJobData {
  notificationLogId: string;
}

export interface BookingReminderJobData {
  bookingId: string;
  /** Snapshot do startsAt no momento em que o lembrete foi agendado — se o booking
   * for reagendado, o horário atual não bate mais com esse valor e o worker pula
   * o envio (equivalente a "cancelar o job antigo" sem precisar removê-lo do Redis). */
  expectedStartsAtIso: string;
  reminderLabel: "24h" | "2h";
}

export interface GoogleCalendarSyncJobData {
  bookingId: string;
}

// Sync inbound é por CONEXÃO (staff), não por booking — evento pessoal do
// Google não tem nenhum booking associado. Fila separada da outbound porque
// os dois sentidos do sync têm gatilhos e granularidade bem diferentes.
export interface GoogleCalendarInboundSyncJobData {
  connectionId: string;
}

// O job só carrega o id — nunca o status ou o valor mandado no corpo do webhook (que é só um
// aviso "algo mudou"). O worker sempre re-busca o pagamento/assinatura real via getPayment()/
// getPreapproval() antes de agir, mesmo padrão já usado no sync do Google Calendar.
export interface PaymentWebhookJobData {
  mpPaymentId: string;
}

export interface SubscriptionWebhookJobData {
  mpPreapprovalId: string;
}

const globalForQueues = globalThis as unknown as {
  notificationsQueue: Queue<SendNotificationJobData> | undefined;
  bookingRemindersQueue: Queue<BookingReminderJobData> | undefined;
  googleCalendarSyncQueue: Queue<GoogleCalendarSyncJobData> | undefined;
  googleCalendarInboundSyncQueue: Queue<GoogleCalendarInboundSyncJobData> | undefined;
  paymentWebhookQueue: Queue<PaymentWebhookJobData> | undefined;
  subscriptionWebhookQueue: Queue<SubscriptionWebhookJobData> | undefined;
};

export function getNotificationsQueue(): Queue<SendNotificationJobData> {
  globalForQueues.notificationsQueue ??= new Queue<SendNotificationJobData>(NOTIFICATIONS_QUEUE, {
    connection: redisConnection,
  });
  return globalForQueues.notificationsQueue;
}

export function getBookingRemindersQueue(): Queue<BookingReminderJobData> {
  globalForQueues.bookingRemindersQueue ??= new Queue<BookingReminderJobData>(
    BOOKING_REMINDERS_QUEUE,
    { connection: redisConnection },
  );
  return globalForQueues.bookingRemindersQueue;
}

export function getGoogleCalendarSyncQueue(): Queue<GoogleCalendarSyncJobData> {
  globalForQueues.googleCalendarSyncQueue ??= new Queue<GoogleCalendarSyncJobData>(
    GOOGLE_CALENDAR_SYNC_QUEUE,
    { connection: redisConnection },
  );
  return globalForQueues.googleCalendarSyncQueue;
}

export function getGoogleCalendarInboundSyncQueue(): Queue<GoogleCalendarInboundSyncJobData> {
  globalForQueues.googleCalendarInboundSyncQueue ??= new Queue<GoogleCalendarInboundSyncJobData>(
    GOOGLE_CALENDAR_INBOUND_SYNC_QUEUE,
    { connection: redisConnection },
  );
  return globalForQueues.googleCalendarInboundSyncQueue;
}

export function getPaymentWebhookQueue(): Queue<PaymentWebhookJobData> {
  globalForQueues.paymentWebhookQueue ??= new Queue<PaymentWebhookJobData>(PAYMENT_WEBHOOK_QUEUE, {
    connection: redisConnection,
  });
  return globalForQueues.paymentWebhookQueue;
}

export function getSubscriptionWebhookQueue(): Queue<SubscriptionWebhookJobData> {
  globalForQueues.subscriptionWebhookQueue ??= new Queue<SubscriptionWebhookJobData>(
    SUBSCRIPTION_WEBHOOK_QUEUE,
    { connection: redisConnection },
  );
  return globalForQueues.subscriptionWebhookQueue;
}
