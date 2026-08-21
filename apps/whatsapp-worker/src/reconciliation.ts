import { prisma } from "@scheduling-saas/database";
import { getNotificationsQueue } from "@scheduling-saas/queue";
import { syncInboundAvailability } from "./google-calendar-inbound-sync";

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

// Mesma decisão Outbox-lite, aplicada ao Google Calendar (decisão 6 do design
// no PRD): cobre webhook perdido (o Google nem sempre entrega — reprocessa
// aqui de qualquer forma) e canal de watch expirando sem renovação a tempo
// (a própria syncInboundAvailability confere e renova). Chama a função direto
// — o worker já está no mesmo processo, não precisa passar pela fila.
export async function reconcileGoogleCalendarConnections(): Promise<number> {
  const connections = await prisma.googleCalendarConnection.findMany({
    select: { id: true },
  });

  for (const connection of connections) {
    try {
      await syncInboundAvailability(connection.id);
    } catch (error) {
      // syncInboundAvailability já marca a conexão como ERROR — aqui só loga
      // e segue pras próximas, uma falha não pode travar a reconciliação inteira.
      console.error(`[reconciliation] falha ao sincronizar conexão ${connection.id}:`, error);
    }
  }

  return connections.length;
}
