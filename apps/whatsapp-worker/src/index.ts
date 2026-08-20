import "./env";
import { Worker } from "bullmq";
import {
  BOOKING_REMINDERS_QUEUE,
  GOOGLE_CALENDAR_SYNC_QUEUE,
  NOTIFICATIONS_QUEUE,
  redisConnection,
} from "@scheduling-saas/queue";
import type {
  BookingReminderJobData,
  GoogleCalendarSyncJobData,
  SendNotificationJobData,
} from "@scheduling-saas/queue";
import { ConsoleNotificationProvider, type NotificationProvider } from "@scheduling-saas/notifications";
import { sendAndLog } from "./notification-sender";
import { processBookingReminderJob } from "./process-booking-reminder";
import { processGoogleCalendarSyncJob } from "./google-calendar-sync";
import { reconcileMissingConfirmations } from "./reconciliation";
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

for (const worker of [notificationsWorker, bookingRemindersWorker, googleCalendarSyncWorker]) {
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

console.log(
  "[whatsapp-worker] booted — consumindo filas 'notifications', 'booking-reminders' e 'google-calendar-sync'",
);

process.on("SIGTERM", () => {
  console.log("[whatsapp-worker] received SIGTERM, shutting down");
  clearInterval(reconciliationTimer);
  Promise.all([
    notificationsWorker.close(),
    bookingRemindersWorker.close(),
    googleCalendarSyncWorker.close(),
  ])
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
