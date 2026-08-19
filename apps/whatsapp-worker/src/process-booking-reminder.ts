import { BLOCKING_BOOKING_STATUSES } from "@scheduling-saas/domain";
import { prisma } from "@scheduling-saas/database";
import type { BookingReminderJobData } from "@scheduling-saas/queue";
import type { NotificationProvider } from "@scheduling-saas/notifications";
import { sendAndLog } from "./notification-sender";

export async function processBookingReminderJob(
  data: BookingReminderJobData,
  provider: NotificationProvider,
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { customer: true },
  });
  if (!booking) {
    console.log(`[booking-reminder] booking ${data.bookingId} não existe mais, pulando`);
    return;
  }

  const isStale = booking.startsAt.toISOString() !== data.expectedStartsAtIso;
  const isBlocking = (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(booking.status);
  if (isStale || !isBlocking) {
    console.log(
      `[booking-reminder] pulando lembrete ${data.reminderLabel} do booking ${booking.id} ` +
        `(stale=${isStale}, status=${booking.status}) — cancelado ou reagendado depois do agendamento do job`,
    );
    return;
  }

  if (!booking.customerPhoneSnapshot) {
    console.log(`[booking-reminder] booking ${booking.id} sem telefone, pulando`);
    return;
  }

  const log = await prisma.notificationLog.create({
    data: {
      companyId: booking.companyId,
      bookingId: booking.id,
      recipientUserId: booking.customer.userId,
      channel: "WHATSAPP",
      type: "BOOKING_REMINDER",
      destination: booking.customerPhoneSnapshot,
      status: "QUEUED",
      scheduledFor: booking.startsAt,
    },
  });

  await sendAndLog(log.id, provider);
}
