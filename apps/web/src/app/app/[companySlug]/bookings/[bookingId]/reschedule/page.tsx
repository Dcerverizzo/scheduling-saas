import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { prisma, type Company, type Service, type StaffProfile } from "@scheduling-saas/database";
import { requireCompanyContext } from "@/lib/company-context";
import { getSlotsForStaff } from "@/lib/booking/get-slots-for-staff";
import { RescheduleSlotGrid } from "@/components/booking/RescheduleSlotGrid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { rescheduleCompanyBookingAction } from "../../actions";

export default async function RescheduleCompanyBookingPage({
  params,
  searchParams,
}: PageProps<"/app/[companySlug]/bookings/[bookingId]/reschedule">) {
  const { companySlug, bookingId } = await params;
  const search = await searchParams;
  const date = typeof search.date === "string" ? search.date : undefined;
  const error = typeof search.error === "string" ? search.error : undefined;

  const { userId, company, membership } = await requireCompanyContext(companySlug);

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, companyId: company.id },
    include: { staff: true, service: true },
  });
  if (!booking) {
    notFound();
  }

  if (membership.role === "STAFF") {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { companyId_userId: { companyId: company.id, userId } },
    });
    if (!staffProfile || booking.staffId !== staffProfile.id) {
      notFound();
    }
  }

  const today = DateTime.now().setZone(company.timezone).toISODate();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-14">
      <div>
        <h1 className="text-xl font-bold">
          Reagendar — {booking.serviceNameSnapshot} com {booking.staff.displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Horário atual: {booking.startsAt.toLocaleString("pt-BR", { timeZone: company.timezone })}
        </p>
      </div>

      {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <form
        action={`/app/${companySlug}/bookings/${bookingId}/reschedule`}
        method="get"
        className="flex items-end gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="reschedule-date">
            Nova data
          </label>
          <Input
            id="reschedule-date"
            type="date"
            name="date"
            required
            min={today ?? undefined}
            defaultValue={date}
            className="font-mono-data"
          />
        </div>
        <Button type="submit">Ver horários</Button>
      </form>

      {date ? (
        <RescheduleDateSlots
          companySlug={companySlug}
          bookingId={bookingId}
          date={date}
          company={company}
          staff={booking.staff}
          service={booking.service}
        />
      ) : null}

      <Link href={`/app/${companySlug}/bookings`} className="text-sm text-muted-foreground hover:underline">
        ← voltar pra agenda
      </Link>
    </main>
  );
}

async function RescheduleDateSlots({
  companySlug,
  bookingId,
  date,
  company,
  staff,
  service,
}: {
  companySlug: string;
  bookingId: string;
  date: string;
  company: Company;
  staff: StaffProfile;
  service: Service;
}) {
  const slots = await getSlotsForStaff({ company, staff, service, date, excludeBookingId: bookingId });

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground">Horários disponíveis em {date}</h2>
      <RescheduleSlotGrid
        slots={slots}
        companyTimezone={company.timezone}
        action={rescheduleCompanyBookingAction.bind(null, companySlug, bookingId, date)}
      />
    </section>
  );
}
