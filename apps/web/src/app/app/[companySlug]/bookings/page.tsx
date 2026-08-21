import Link from "next/link";
import { DateTime } from "luxon";
import { prisma, type Booking } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { requireCompanyContext } from "@/lib/company-context";
import { getDaySchedule, minutesSinceMidnight, type DaySchedule } from "@/lib/booking/get-day-schedule";
import { CompanyNav } from "../CompanyNav";
import { cancelCompanyBookingAction } from "./actions";

const PX_PER_MINUTE = 1.15;
const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default async function CompanyBookingsPage({
  params,
  searchParams,
}: PageProps<"/app/[companySlug]/bookings">) {
  const { companySlug } = await params;
  const search = await searchParams;
  const { userId, company, membership } = await requireCompanyContext(companySlug);

  const today = DateTime.now().setZone(company.timezone).toISODate() as string;
  const date = typeof search.date === "string" ? search.date : today;
  const focusDay = DateTime.fromISO(date, { zone: company.timezone });

  let staff = await prisma.staffProfile.findMany({
    where: { companyId: company.id, active: true },
    orderBy: { displayName: "asc" },
  });
  if (membership.role === "STAFF") {
    staff = staff.filter((member) => member.userId === userId);
  }

  const schedule: DaySchedule =
    staff.length > 0
      ? await getDaySchedule({ company, staffIds: staff.map((member) => member.id), date })
      : { gridStartMinutes: 8 * 60, gridEndMinutes: 20 * 60, bookingsByStaffId: new Map() };

  const gridHeight = (schedule.gridEndMinutes - schedule.gridStartMinutes) * PX_PER_MINUTE;
  const hourMarks: { label: string; top: number }[] = [];
  for (let m = Math.ceil(schedule.gridStartMinutes / 60) * 60; m <= schedule.gridEndMinutes; m += 60) {
    hourMarks.push({
      label: `${String(Math.floor(m / 60)).padStart(2, "0")}:00`,
      top: (m - schedule.gridStartMinutes) * PX_PER_MINUTE,
    });
  }

  const prevDate = focusDay.minus({ days: 1 }).toISODate();
  const nextDate = focusDay.plus({ days: 1 }).toISODate();

  return (
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">
              Agenda{membership.role === "STAFF" ? " — minha agenda" : ""}
            </h1>
            <div className="flex items-center gap-1">
              <Link
                href={`?date=${prevDate}`}
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                aria-label="Dia anterior"
              >
                ‹
              </Link>
              <span className="font-mono-data px-2 text-sm font-bold">
                {WEEKDAY_LABELS[focusDay.weekday % 7]} · {focusDay.toFormat("dd/MM")}
              </span>
              <Link
                href={`?date=${nextDate}`}
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                aria-label="Próximo dia"
              >
                ›
              </Link>
            </div>
            {date !== today ? (
              <Link href="?" className="text-xs font-medium text-primary hover:underline">
                hoje
              </Link>
            ) : null}
          </div>
        </div>

        {staff.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            {membership.role === "STAFF"
              ? "Você não está cadastrado como profissional ativo nesta empresa."
              : "Cadastre profissionais ativos pra ver a agenda."}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
            <div
              className="grid min-w-fit"
              style={{ gridTemplateColumns: `64px repeat(${staff.length}, minmax(220px, 1fr))` }}
            >
              <div className="border-b border-r border-border/70" />
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 border-b border-r border-border/70 px-4 py-3 last:border-r-0"
                >
                  <span className="font-mono-data flex size-6 flex-none items-center justify-center rounded-full bg-secondary text-[10.5px] font-bold text-secondary-foreground">
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">{member.displayName}</span>
                </div>
              ))}

              <div className="relative border-r border-border/70" style={{ height: gridHeight }}>
                {hourMarks.map((mark) => (
                  <span
                    key={mark.label}
                    className="font-mono-data absolute right-2 -translate-y-1.5 text-[11px] text-muted-foreground"
                    style={{ top: mark.top }}
                  >
                    {mark.label}
                  </span>
                ))}
              </div>

              {staff.map((member) => (
                <div
                  key={member.id}
                  className="relative border-r border-border/70 last:border-r-0"
                  style={{
                    height: gridHeight,
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0 59px, var(--border) 59px 60px)",
                    backgroundSize: `100% ${60 * PX_PER_MINUTE}px`,
                  }}
                >
                  {(schedule.bookingsByStaffId.get(member.id) ?? []).map((booking) => (
                    <AppointmentBlock
                      key={booking.id}
                      booking={booking}
                      companySlug={companySlug}
                      timezone={company.timezone}
                      gridStartMinutes={schedule.gridStartMinutes}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-5">
          <Legend swatchClassName="bg-secondary border-l-2 border-primary" label="Confirmado" />
          <Legend swatchClassName="bg-muted border-l-2 border-muted-foreground" label="Concluído" />
        </div>
      </main>
    </>
  );
}

function Legend({ swatchClassName, label }: { swatchClassName: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${swatchClassName}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function AppointmentBlock({
  booking,
  companySlug,
  timezone,
  gridStartMinutes,
}: {
  booking: Booking;
  companySlug: string;
  timezone: string;
  gridStartMinutes: number;
}) {
  const startMinutes = minutesSinceMidnight(booking.startsAt, timezone);
  const endMinutes = minutesSinceMidnight(booking.endsAt, timezone);
  const top = (startMinutes - gridStartMinutes) * PX_PER_MINUTE;
  const height = Math.max((endMinutes - startMinutes) * PX_PER_MINUTE, 20);
  const isCompleted = booking.status === "COMPLETED";
  const compact = height < 44;

  const localTime = booking.startsAt.toLocaleTimeString("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`absolute inset-x-1.5 overflow-hidden rounded-md border-l-2 px-2.5 py-1 shadow-sm ${
        isCompleted ? "border-muted-foreground bg-muted" : "border-primary bg-secondary"
      }`}
      style={{ top, height }}
    >
      <p
        className={`truncate text-[12.5px] font-semibold leading-tight ${
          isCompleted ? "text-muted-foreground" : "text-secondary-foreground"
        }`}
      >
        {booking.serviceNameSnapshot} — {booking.customerNameSnapshot}
      </p>
      {!compact ? (
        <p className="font-mono-data text-[10.5px] text-secondary-foreground/70">
          {localTime} · R$ {formatCentsAsDecimalString(booking.servicePriceSnapshot)}
        </p>
      ) : null}
      {!compact && !isCompleted ? (
        <div className="mt-0.5 flex gap-2.5">
          <Link
            href={`/app/${companySlug}/bookings/${booking.id}/reschedule`}
            className="text-[10.5px] text-secondary-foreground/70 underline underline-offset-2 hover:text-secondary-foreground"
          >
            reagendar
          </Link>
          <form action={cancelCompanyBookingAction.bind(null, companySlug, booking.id)}>
            <button
              type="submit"
              className="text-[10.5px] text-destructive underline underline-offset-2 hover:text-destructive/80"
            >
              cancelar
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
