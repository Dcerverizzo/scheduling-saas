import { prisma } from "@scheduling-saas/database";
import type { NotificationProvider } from "@scheduling-saas/notifications";
import { buildBookingMessageData, buildMessage } from "./build-message";

// Núcleo compartilhado por confirmação/cancelamento/reagendamento (imediatos) e
// lembretes (que só criam o NotificationLog depois de passar na checagem de staleness
// em processBookingReminderJob) — ambos convergem aqui pra enviar + atualizar o log.
export async function sendAndLog(
  notificationLogId: string,
  provider: NotificationProvider,
): Promise<void> {
  const log = await prisma.notificationLog.findUniqueOrThrow({
    where: { id: notificationLogId },
    include: { booking: { include: { company: true, staff: true } } },
  });

  if (log.status === "SENT" || log.status === "DELIVERED") {
    return;
  }

  if (!log.booking) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", failedAt: new Date(), errorMessage: "booking não encontrado" },
    });
    return;
  }

  await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "PROCESSING" } });

  const messageData = buildBookingMessageData(log.booking, log.booking.company, log.booking.staff);
  const message = buildMessage(log.type, messageData);

  const result = await provider.send({
    channel: log.channel,
    type: log.type,
    destination: log.destination,
    message,
  });

  if (result.success) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
        attemptCount: { increment: 1 },
      },
    });
    return;
  }

  await prisma.notificationLog.update({
    where: { id: log.id },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      attemptCount: { increment: 1 },
    },
  });
  // Propaga o erro pro BullMQ aplicar o retry/backoff configurado no job.
  throw new Error(result.errorMessage ?? "Falha ao enviar notificação");
}
