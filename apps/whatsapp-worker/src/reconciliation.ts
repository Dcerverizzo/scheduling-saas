import { prisma } from "@scheduling-saas/database";
import { getNotificationsQueue } from "@scheduling-saas/queue";
import { syncInboundAvailability } from "./google-calendar-inbound-sync";
import { processSubscriptionWebhookJob } from "./process-subscription-webhook";

// Rede de segurança no lugar do Outbox completo (decisão da sessão de grilling):
// pega bookings confirmados que ficaram sem NotificationLog de confirmação — cenário
// raro (processo caiu entre o commit do booking e o enqueue), mas cobre o risco sem
// precisar de uma tabela/worker novos.
//
// Só CONFIRMED entra aqui — nunca PENDING. Desde que pagamento no booking existe, PENDING
// passou a significar "esperando o Mercado Pago confirmar", e mandar uma mensagem de
// "agendamento confirmado" pra um booking que ainda nem foi pago seria uma notificação falsa.
// Bookings PENDING sem pagamento aprovado têm sua própria rede de segurança em
// reconcileExpiredPayments() abaixo.
export async function reconcileMissingConfirmations(): Promise<number> {
  const staleBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
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

// Cobre o cenário em que o cliente abandona o checkout sem pagar (ou o webhook nunca chega):
// um Payment PENDING além do prazo (Payment.expiresAt) libera o slot de volta. O updateMany
// com status="PENDING" no WHERE é a mesma defesa contra corrida usada em
// processPaymentWebhookJob — se um webhook de aprovação chegou entre a leitura e agora, count
// vem 0 e esta iteração simplesmente não faz nada (o webhook já venceu a corrida).
export async function reconcileExpiredPayments(): Promise<number> {
  const expiredPayments = await prisma.payment.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    take: 50,
  });

  let resolvedCount = 0;
  for (const payment of expiredPayments) {
    const { count } = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (count === 0) continue;

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
      prisma.bookingEvent.create({
        data: { bookingId: payment.bookingId, companyId: payment.companyId, type: "BOOKING_CANCELLED" },
      }),
    ]);
    resolvedCount += 1;
    console.log(`[reconciliation] booking ${payment.bookingId} cancelado — pagamento expirou sem aprovação`);
  }

  return resolvedCount;
}

// Rede de segurança pra webhook de assinatura perdido — re-busca toda CompanySubscription
// não-terminal direto no Mercado Pago. Reaproveita processSubscriptionWebhookJob (mesma lógica
// de mapear status + persistir) em vez de duplicar — mesmo espírito de
// reconcileGoogleCalendarConnections chamando syncInboundAvailability diretamente.
export async function reconcilePlatformSubscriptions(): Promise<number> {
  const subscriptions = await prisma.companySubscription.findMany({
    where: { status: { in: ["PENDING", "AUTHORIZED", "PAUSED"] }, mpPreapprovalId: { not: null } },
    select: { id: true, mpPreapprovalId: true },
  });

  for (const subscription of subscriptions) {
    if (!subscription.mpPreapprovalId) continue;
    try {
      await processSubscriptionWebhookJob({ mpPreapprovalId: subscription.mpPreapprovalId });
    } catch (error) {
      console.error(`[reconciliation] falha ao sincronizar assinatura ${subscription.id}:`, error);
    }
  }

  return subscriptions.length;
}
