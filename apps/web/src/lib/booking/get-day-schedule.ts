import { DateTime } from "luxon";
import { prisma, type Booking, type Company } from "@scheduling-saas/database";

const DEFAULT_GRID_START_MINUTES = 8 * 60;
const DEFAULT_GRID_END_MINUTES = 20 * 60;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export interface DaySchedule {
  gridStartMinutes: number;
  gridEndMinutes: number;
  bookingsByStaffId: Map<string, Booking[]>;
}

// Calcula os limites do grid do dia a partir das AvailabilityRule ativas dos
// profissionais visíveis nesse dia da semana — a agenda se ajusta ao horário
// real de funcionamento em vez de um intervalo fixo arbitrário. Sem nenhuma
// regra cadastrada pro dia, cai num intervalo padrão razoável (08:00–20:00).
export async function getDaySchedule(input: {
  company: Company;
  staffIds: string[];
  date: string;
}): Promise<DaySchedule> {
  const dayStart = DateTime.fromISO(input.date, { zone: input.company.timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });
  const dayOfWeek = dayStart.weekday % 7; // luxon: 1=segunda..7=domingo -> 0=domingo..6=sábado

  const [rules, bookings] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { staffId: { in: input.staffIds }, dayOfWeek, active: true },
    }),
    prisma.booking.findMany({
      where: {
        staffId: { in: input.staffIds },
        status: { not: "CANCELLED" },
        startsAt: { gte: dayStart.toJSDate(), lt: dayEnd.toJSDate() },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  let gridStartMinutes = DEFAULT_GRID_START_MINUTES;
  let gridEndMinutes = DEFAULT_GRID_END_MINUTES;
  if (rules.length > 0) {
    gridStartMinutes = Math.min(...rules.map((rule) => timeToMinutes(rule.startTime)));
    gridEndMinutes = Math.max(...rules.map((rule) => timeToMinutes(rule.endTime)));
  }

  const bookingsByStaffId = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const list = bookingsByStaffId.get(booking.staffId) ?? [];
    list.push(booking);
    bookingsByStaffId.set(booking.staffId, list);
  }

  return { gridStartMinutes, gridEndMinutes, bookingsByStaffId };
}

export function minutesSinceMidnight(date: Date, timezone: string): number {
  const dt = DateTime.fromJSDate(date, { zone: timezone });
  return dt.hour * 60 + dt.minute;
}
