import { prisma } from "@scheduling-saas/database";
import { getGoogleCalendarSyncQueue } from "@scheduling-saas/queue";

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 30_000 },
};

// Mesma filosofia do job de lembrete (Step 7): o job só carrega o bookingId, nunca a
// intenção do momento (criar/cancelar/reagendar) — o worker reconfere o status ATUAL
// do booking ao processar, o que cobre create/cancel/reschedule com um job só e nunca
// fica desatualizado se o booking mudar de novo antes do job rodar.
export async function enqueueGoogleCalendarSync(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { staffId: true },
  });
  if (!booking) return;

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { staffId: booking.staffId },
    select: { id: true },
  });
  if (!connection) return; // staff não conectou o Google Calendar — nada a sincronizar

  await getGoogleCalendarSyncQueue().add("sync-booking-event", { bookingId }, DEFAULT_JOB_OPTIONS);
}
