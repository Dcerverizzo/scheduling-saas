import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const NOTIFICATIONS_QUEUE = "notifications";
export const BOOKING_REMINDERS_QUEUE = "booking-reminders";

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

const globalForQueues = globalThis as unknown as {
  notificationsQueue: Queue<SendNotificationJobData> | undefined;
  bookingRemindersQueue: Queue<BookingReminderJobData> | undefined;
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
