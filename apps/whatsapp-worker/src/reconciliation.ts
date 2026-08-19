import { prisma } from "@scheduling-saas/database";
import { getNotificationsQueue } from "@scheduling-saas/queue";

// Rede de segurança no lugar do Outbox completo (decisão da sessão de grilling):
// pega bookings confirmados que ficaram sem NotificationLog de confirmação — cenário
// raro (processo caiu entre o commit do booking e o enqueue), mas cobre o risco sem
// precisar de uma tabela/worker novos.
export async function reconcileMissingConfirmations(): Promise<number> {
  const staleBookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      createdAt: { lt: new Date(Date.now() - 5 * 60_000) },
      notificationLogs: { none: { type: "BOOKING_CONFIRMATION" } },
    },
    include: { customer: true },
    take: 50,
  });

  for (const booking of staleBookings) {
    if (!booking.customerPhoneSnapshot) continue;

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
      { attempts: 3, backoff: { type: "exponential", delay: 30_000 } },
    );

    console.log(`[reconciliation] reenfileirada confirmação do booking ${booking.id}`);
  }

  return staleBookings.length;
}
