import { canTransitionBookingStatus, DomainError } from "@scheduling-saas/domain";
import { prisma, type Booking } from "@scheduling-saas/database";
import { enqueueBookingCancelledNotification } from "@/lib/notifications/enqueue-booking-notifications";
import { enqueueGoogleCalendarSync } from "@/lib/google-calendar/enqueue-booking-sync";

export interface CancelBookingInput {
  bookingId: string;
  companyId: string;
  actorUserId?: string;
}

// Nunca deleta um Booking — só muda status e registra o evento (item 27 do PRD).
export async function cancelBooking(input: CancelBookingInput): Promise<Booking> {
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, companyId: input.companyId },
  });
  if (!booking) {
    throw new DomainError("BOOKING_NOT_FOUND", "Agendamento não encontrado.");
  }

  if (!canTransitionBookingStatus(booking.status, "CANCELLED")) {
    throw new DomainError(
      "INVALID_BOOKING_STATE",
      `Não é possível cancelar um agendamento com status ${booking.status}.`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        type: "BOOKING_CANCELLED",
      },
    });

    return result;
  });

  // Fora da transação (item 21 do PRD). Lembretes pendentes ficam obsoletos
  // sozinhos — o worker confere o status antes de mandar (item 33).
  await enqueueBookingCancelledNotification(updated.id);
  await enqueueGoogleCalendarSync(updated.id);

  return updated;
}
