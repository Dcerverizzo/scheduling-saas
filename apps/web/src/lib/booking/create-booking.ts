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

export interface CreateBookingInput {
  companyId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startsAt: Date;
  idempotencyKey?: string;
  actorUserId?: string;
}

// Segue o pipeline do item 21 do PRD: validar -> carregar company/staff/service ->
// validar ServiceStaff -> calcular intervalo -> checar disponibilidade -> persistir
// em transação -> (notificações ficam pro Step 7, fora da transação).
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  if (input.idempotencyKey) {
    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return existing;
    }
  }

  const company = await prisma.company.findFirst({
    where: { id: input.companyId, deletedAt: null },
  });
  if (!company) {
    throw new DomainError("COMPANY_NOT_FOUND", "Empresa não encontrada.");
  }

  const staff = await prisma.staffProfile.findFirst({
    where: { id: input.staffId, companyId: company.id, active: true },
  });
  if (!staff) {
    throw new DomainError("STAFF_NOT_AVAILABLE", "Profissional não encontrado ou inativo.");
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, companyId: company.id, active: true, deletedAt: null },
  });
  if (!service) {
    throw new DomainError("SERVICE_NOT_FOUND", "Serviço não encontrado ou inativo.");
  }

  const serviceStaff = await prisma.serviceStaff.findUnique({
    where: { serviceId_staffId: { serviceId: service.id, staffId: staff.id } },
  });
  if (!serviceStaff) {
    throw new DomainError(
      "STAFF_NOT_AVAILABLE",
      "Esse profissional não presta esse serviço.",
    );
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { id: input.customerId },
    include: { user: true },
  });
  if (!customer) {
    throw new DomainError("UNAUTHORIZED", "Cliente não encontrado.");
  }

  const endsAt = new Date(input.startsAt.getTime() + service.durationMinutes * 60_000);

  // Backend recalcula tudo — nunca confia em duração/preço/endsAt vindo do cliente.
  const requestedLocalDate = DateTime.fromJSDate(input.startsAt, { zone: company.timezone });
  const dateKey = requestedLocalDate.toISODate();
  if (!dateKey) {
    throw new DomainError("BOOKING_SLOT_UNAVAILABLE", "Data inválida.");
  }

  const [rules, exceptions, existingBookings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { staffId: staff.id, active: true } }),
    prisma.availabilityException.findMany({ where: { staffId: staff.id } }),
    prisma.booking.findMany({
      where: { staffId: staff.id, status: { in: [...BLOCKING_BOOKING_STATUSES] } },
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
    existingBookings,
  });

  const isRequestedSlotAvailable = availableSlots.some(
    (slot) => slot.getTime() === input.startsAt.getTime(),
  );
  if (!isRequestedSlotAvailable) {
    throw new DomainError(
      "BOOKING_SLOT_UNAVAILABLE",
      "Esse horário não está disponível. Escolha outro.",
    );
  }

  // Empresa sem exigência de pagamento segue direto pra CONFIRMED (comportamento de sempre).
  // Com DEPOSIT/FULL, o booking nasce PENDING — já está em BLOCKING_BOOKING_STATUSES, então o
  // slot continua protegido pela exclusion constraint GiST sem nenhuma mudança nela; quem chama
  // (confirmBookingAction/confirmGuestBookingAction) é responsável por criar o Payment e
  // redirecionar pro checkout quando o status vier PENDING.
  const initialStatus = company.paymentRequirement === "NONE" ? "CONFIRMED" : "PENDING";

  try {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          staffId: staff.id,
          serviceId: service.id,
          startsAt: input.startsAt,
          endsAt,
          status: initialStatus,
          customerNameSnapshot: customer.user.name,
          customerPhoneSnapshot: customer.phone,
          serviceNameSnapshot: service.name,
          serviceDurationSnapshot: service.durationMinutes,
          servicePriceSnapshot: service.priceInCents,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          companyId: company.id,
          actorUserId: input.actorUserId,
          type: "BOOKING_CREATED",
        },
      });

      return booking;
    });
  } catch (error) {
    // Última linha de defesa: mesmo que a checagem acima tenha passado, uma
    // segunda requisição pode ter vencido a corrida entre a leitura e o insert.
    // A EXCLUDE constraint do banco pega isso; aqui só traduzimos pra um erro
    // amigável (item 80 do PRD) em vez de deixar vazar um 500 genérico.
    if (isExclusionConstraintViolation(error)) {
      throw new DomainError(
        "BOOKING_SLOT_UNAVAILABLE",
        "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.",
      );
    }
    throw error;
  }
}
