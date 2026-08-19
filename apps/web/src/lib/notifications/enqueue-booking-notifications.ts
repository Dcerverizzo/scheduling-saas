import { prisma, type NotificationType } from "@scheduling-saas/database";
import { getBookingRemindersQueue, getNotificationsQueue } from "@scheduling-saas/queue";

const REMINDER_OFFSETS: { label: "24h" | "2h"; minutesBefore: number }[] = [
  { label: "24h", minutesBefore: 24 * 60 },
  { label: "2h", minutesBefore: 2 * 60 },
];

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 30_000 },
};

async function enqueueImmediate(bookingId: string, type: NotificationType): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });
  if (!booking?.customerPhoneSnapshot) return;

  const log = await prisma.notificationLog.create({
    data: {
      companyId: booking.companyId,
      bookingId: booking.id,
      recipientUserId: booking.customer.userId,
      channel: "WHATSAPP",
      type,
      destination: booking.customerPhoneSnapshot,
      status: "QUEUED",
    },
  });

  await getNotificationsQueue().add(
    "send-notification",
    { notificationLogId: log.id },
    DEFAULT_JOB_OPTIONS,
  );
}

export async function enqueueBookingConfirmation(bookingId: string): Promise<void> {
  await enqueueImmediate(bookingId, "BOOKING_CONFIRMATION");
}

export async function enqueueBookingCancelledNotification(bookingId: string): Promise<void> {
  await enqueueImmediate(bookingId, "BOOKING_CANCELLED");
}

export async function enqueueBookingRescheduledNotification(bookingId: string): Promise<void> {
  await enqueueImmediate(bookingId, "BOOKING_RESCHEDULED");
}

// Não precisa cancelar/remover jobs antigos explicitamente (item 33/34 do PRD) —
// cada job de lembrete carrega o startsAt esperado; se o booking for reagendado ou
// cancelado, o worker detecta o descompasso e pula o envio (ver expectedStartsAtIso).
export async function scheduleBookingReminders(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking?.customerPhoneSnapshot) return;

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
