import {
  BLOCKING_BOOKING_STATUSES,
  getAvailableSlots,
  type AvailabilityExceptionInput,
  type AvailabilityRuleInput,
} from "@scheduling-saas/domain";
import { prisma, type Company, type Service, type StaffProfile } from "@scheduling-saas/database";

export async function getSlotsForStaff(input: {
  company: Company;
  staff: StaffProfile;
  service: Service;
  date: string;
  excludeBookingId?: string;
}): Promise<Date[]> {
  const [rules, exceptions, existingBookings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { staffId: input.staff.id, active: true } }),
    prisma.availabilityException.findMany({ where: { staffId: input.staff.id } }),
    prisma.booking.findMany({
      where: {
        staffId: input.staff.id,
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
        ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
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

  return getAvailableSlots({
    date: input.date,
    timezone: input.company.timezone,
    serviceDurationMinutes: input.service.durationMinutes,
    bufferBeforeMinutes: input.service.bufferBeforeMinutes,
    bufferAfterMinutes: input.service.bufferAfterMinutes,
    rules: ruleInputs,
    exceptions: exceptionInputs,
    existingBookings,
  });
}
