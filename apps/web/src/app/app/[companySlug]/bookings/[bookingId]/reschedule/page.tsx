import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { prisma, type Company, type Service, type StaffProfile } from "@scheduling-saas/database";
import { requireCompanyContext } from "@/lib/company-context";
import { getSlotsForStaff } from "@/lib/booking/get-slots-for-staff";
import { RescheduleSlotGrid } from "@/components/booking/RescheduleSlotGrid";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">
        Reagendar — {booking.serviceNameSnapshot} com {booking.staff.displayName}
      </h1>
      <p className="text-sm text-gray-500">
        Horário atual:{" "}
        {booking.startsAt.toLocaleString("pt-BR", { timeZone: company.timezone })}
      </p>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <form
        action={`/app/${companySlug}/bookings/${bookingId}/reschedule`}
        method="get"
        className="flex items-end gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nova data
          <input
            type="date"
            name="date"
            required
            min={today ?? undefined}
            defaultValue={date}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
          Ver horários
        </button>
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

      <Link href={`/app/${companySlug}/bookings`} className="text-sm underline">
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
      <h2 className="text-lg font-medium">Horários disponíveis em {date}</h2>
      <RescheduleSlotGrid
        slots={slots}
        companyTimezone={company.timezone}
        action={rescheduleCompanyBookingAction.bind(null, companySlug, bookingId, date)}
      />
    </section>
  );
}
