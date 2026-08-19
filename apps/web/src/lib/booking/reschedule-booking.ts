import { DateTime } from "luxon";
import {
  BLOCKING_BOOKING_STATUSES,
  DomainError,
  getAvailableSlots,
  type AvailabilityExceptionInput,
  type AvailabilityRuleInput,
} from "@scheduling-saas/domain";
import { prisma, type Booking } from "@scheduling-saas/database";
import { isExclusionConstraintViolation } from "./postgres-errors";
import {
  enqueueBookingRescheduledNotification,
  scheduleBookingReminders,
} from "@/lib/notifications/enqueue-booking-notifications";

export interface RescheduleBookingInput {
  bookingId: string;
  companyId: string;
  newStartsAt: Date;
  actorUserId?: string;
}

// Decisão da sessão de grilling: reagendar atualiza o MESMO registro (não cria um
// Booking novo vinculado ao anterior) — histórico fica só no BookingEvent.
export async function rescheduleBooking(input: RescheduleBookingInput): Promise<Booking> {
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, companyId: input.companyId },
  });
  if (!booking) {
    throw new DomainError("BOOKING_NOT_FOUND", "Agendamento não encontrado.");
  }
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    throw new DomainError(
      "INVALID_BOOKING_STATE",
      `Não é possível reagendar um agendamento com status ${booking.status}.`,
    );
  }

  const company = await prisma.company.findFirstOrThrow({ where: { id: input.companyId } });
  const service = await prisma.service.findFirstOrThrow({ where: { id: booking.serviceId } });

  const newEndsAt = new Date(input.newStartsAt.getTime() + service.durationMinutes * 60_000);

  const requestedLocalDate = DateTime.fromJSDate(input.newStartsAt, { zone: company.timezone });
  const dateKey = requestedLocalDate.toISODate();
  if (!dateKey) {
    throw new DomainError("BOOKING_SLOT_UNAVAILABLE", "Data inválida.");
  }

  const [rules, exceptions, otherBookings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { staffId: booking.staffId, active: true } }),
    prisma.availabilityException.findMany({ where: { staffId: booking.staffId } }),
    // Exclui o próprio booking sendo movido — senão ele conflitaria com o próprio horário antigo.
    prisma.booking.findMany({
      where: {
        staffId: booking.staffId,
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
        id: { not: booking.id },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const ruleInputs: AvailabilityRuleInput[] = rules.map((rule) => ({
    dayOfWeek: rule.dayOfWeek,
    startTime: rule.startTime,
    endTime: rule.endTime,
    validFrom: rule.validFrom,
    validUntil: rule.validUntil,
    active: rule.active,
  }));
  const exceptionInputs: AvailabilityExceptionInput[] = exceptions.map((exception) => ({
    type: exception.type,
    startsAt: exception.startsAt,
    endsAt: exception.endsAt,
  }));

  const availableSlots = getAvailableSlots({
    date: dateKey,
    timezone: company.timezone,
    serviceDurationMinutes: service.durationMinutes,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    rules: ruleInputs,
    exceptions: exceptionInputs,
    existingBookings: otherBookings,
  });

  const isRequestedSlotAvailable = availableSlots.some(
    (slot) => slot.getTime() === input.newStartsAt.getTime(),
  );
  if (!isRequestedSlotAvailable) {
    throw new DomainError(
      "BOOKING_SLOT_UNAVAILABLE",
      "Esse horário não está disponível. Escolha outro.",
    );
  }

  const previousStartsAt = booking.startsAt;

  let updated: Booking;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: booking.id },
        data: { startsAt: input.newStartsAt, endsAt: newEndsAt },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          type: "BOOKING_RESCHEDULED",
          metadata: {
            previousStartsAt: previousStartsAt.toISOString(),
            newStartsAt: input.newStartsAt.toISOString(),
          },
        },
      });

      return result;
    });
  } catch (error) {
    if (isExclusionConstraintViolation(error)) {
      throw new DomainError(
        "BOOKING_SLOT_UNAVAILABLE",
        "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.",
      );
    }
    throw error;
  }

  // Fora da transação. Lembretes antigos (com o startsAt anterior) ficam obsoletos
  // sozinhos; agenda novos lembretes pro horário atualizado.
  await enqueueBookingRescheduledNotification(updated.id);
  await scheduleBookingReminders(updated.id);

  return updated;
}
