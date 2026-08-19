import { DateTime } from "luxon";
import { overlaps, subtractIntervals, type Interval } from "./intervals";

export type AvailabilityExceptionType = "BLOCK" | "AVAILABLE";

export interface AvailabilityRuleInput {
  dayOfWeek: number; // 0=domingo .. 6=sábado (convenção JS Date#getDay())
  startTime: string; // "HH:mm", horário LOCAL da empresa
  endTime: string; // "HH:mm", horário LOCAL da empresa
  validFrom?: Date | null;
  validUntil?: Date | null;
  active: boolean;
}

export interface AvailabilityExceptionInput {
  type: AvailabilityExceptionType;
  startsAt: Date; // instante absoluto (UTC)
  endsAt: Date;
}

export interface ExistingBookingInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface GetAvailableSlotsInput {
  /** Dia solicitado no calendário da empresa, formato "YYYY-MM-DD". */
  date: string;
  /** Fuso IANA da empresa, ex: "America/Sao_Paulo". */
  timezone: string;
  serviceDurationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  slotIntervalMinutes?: number;
  minimumBookingNoticeMinutes?: number;
  maximumBookingAdvanceDays?: number;
  /** Instante "agora" injetável — testabilidade determinística. */
  now?: Date;
  rules: AvailabilityRuleInput[];
  exceptions?: AvailabilityExceptionInput[];
  /**
   * Intervalos já ocupados por bookings existentes. Espera-se que o chamador já
   * inclua os buffers do próprio serviço agendado nesses intervalos, se aplicável —
   * esta função não conhece o serviço de bookings passados, só do candidato.
   */
  existingBookings?: ExistingBookingInterval[];
}

function localTimeToUtc(date: string, time: string, timezone: string): Date {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
  if (!dt.isValid) {
    throw new Error(
      `Horário local inválido: ${date}T${time} (${timezone}): ${dt.invalidExplanation}`,
    );
  }
  return dt.toJSDate();
}

function dayOfWeekInZone(date: string, timezone: string): number {
  const dt = DateTime.fromISO(date, { zone: timezone });
  // luxon: 1=segunda..7=domingo -> convenção deste módulo: 0=domingo..6=sábado
  return dt.weekday % 7;
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isRuleActiveOnDate(rule: AvailabilityRuleInput, date: string): boolean {
  if (!rule.active) return false;
  if (rule.validFrom && date < isoDateOnly(rule.validFrom)) return false;
  if (rule.validUntil && date > isoDateOnly(rule.validUntil)) return false;
  return true;
}

export function getAvailableSlots(input: GetAvailableSlotsInput): Date[] {
  const {
    date,
    timezone,
    serviceDurationMinutes,
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    slotIntervalMinutes = 15,
    minimumBookingNoticeMinutes = 0,
    maximumBookingAdvanceDays = 90,
    now = new Date(),
    rules,
    exceptions = [],
    existingBookings = [],
  } = input;

  const dow = dayOfWeekInZone(date, timezone);

  // 1. Janelas base a partir das regras recorrentes que valem nesse dia da semana.
  let windows: Interval[] = rules
    .filter((rule) => rule.dayOfWeek === dow && isRuleActiveOnDate(rule, date))
    .map((rule) => ({
      start: localTimeToUtc(date, rule.startTime, timezone),
      end: localTimeToUtc(date, rule.endTime, timezone),
    }))
    .filter((window) => window.start < window.end);

  // 2. Exceções AVAILABLE somam janelas extraordinárias, recortadas ao dia pedido.
  const dayStart = localTimeToUtc(date, "00:00", timezone);
  const dayEnd = DateTime.fromJSDate(dayStart, { zone: timezone }).plus({ days: 1 }).toJSDate();
  const dayInterval: Interval = { start: dayStart, end: dayEnd };

  const availableExceptions = exceptions
    .filter(
      (exception) =>
        exception.type === "AVAILABLE" &&
        overlaps({ start: exception.startsAt, end: exception.endsAt }, dayInterval),
    )
    .map((exception) => ({
      start: exception.startsAt > dayStart ? exception.startsAt : dayStart,
      end: exception.endsAt < dayEnd ? exception.endsAt : dayEnd,
    }));
  windows = [...windows, ...availableExceptions];

  // 3. Exceções BLOCK removem das janelas (parcial ou totalmente).
  const blockExceptions: Interval[] = exceptions
    .filter((exception) => exception.type === "BLOCK")
    .map((exception) => ({ start: exception.startsAt, end: exception.endsAt }));
  windows = subtractIntervals(windows, blockExceptions);

  const occupied: Interval[] = existingBookings.map((booking) => ({
    start: booking.startsAt,
    end: booking.endsAt,
  }));

  const durationMs = serviceDurationMinutes * 60_000;
  const bufferBeforeMs = bufferBeforeMinutes * 60_000;
  const bufferAfterMs = bufferAfterMinutes * 60_000;
  const stepMs = slotIntervalMinutes * 60_000;

  const earliestAllowed = new Date(now.getTime() + minimumBookingNoticeMinutes * 60_000);
  const latestAllowed = new Date(now.getTime() + maximumBookingAdvanceDays * 24 * 60 * 60_000);

  const slots: Date[] = [];

  for (const window of windows) {
    let candidateMs = window.start.getTime();
    const windowEndMs = window.end.getTime();

    while (candidateMs + durationMs <= windowEndMs) {
      const slotStart = new Date(candidateMs);
      const bufferedInterval: Interval = {
        start: new Date(candidateMs - bufferBeforeMs),
        end: new Date(candidateMs + durationMs + bufferAfterMs),
      };

      const withinNotice = slotStart >= earliestAllowed && slotStart <= latestAllowed;
      const conflictsWithBooking = occupied.some((booked) => overlaps(bufferedInterval, booked));
      const conflictsWithBlock = blockExceptions.some((blocked) =>
        overlaps(bufferedInterval, blocked),
      );

      if (withinNotice && !conflictsWithBooking && !conflictsWithBlock) {
        slots.push(slotStart);
      }

      candidateMs += stepMs;
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}
