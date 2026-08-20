import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { prisma, type Company, type Service, type StaffProfile } from "@scheduling-saas/database";
import { requireSession } from "@/lib/session";
import { getSlotsForStaff } from "@/lib/booking/get-slots-for-staff";
import { RescheduleSlotGrid } from "@/components/booking/RescheduleSlotGrid";
import { rescheduleMyBookingAction } from "../../actions";

export default async function RescheduleMyBookingPage({
  params,
  searchParams,
}: PageProps<"/account/bookings/[bookingId]/reschedule">) {
  const { bookingId } = await params;
  const search = await searchParams;
  const date = typeof search.date === "string" ? search.date : undefined;
  const error = typeof search.error === "string" ? search.error : undefined;

  const session = await requireSession();

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id } });
  if (!customer) {
    notFound();
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: customer.id },
    include: { staff: true, service: true, company: true },
  });
  if (!booking) {
    notFound();
  }

  const today = DateTime.now().setZone(booking.company.timezone).toISODate();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">
        Reagendar — {booking.serviceNameSnapshot} ({booking.company.name})
      </h1>
      <p className="text-sm text-gray-500">
        Horário atual:{" "}
        {booking.startsAt.toLocaleString("pt-BR", { timeZone: booking.company.timezone })}
      </p>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <form
        action={`/account/bookings/${bookingId}/reschedule`}
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
          bookingId={bookingId}
          date={date}
          company={booking.company}
          staff={booking.staff}
          service={booking.service}
        />
      ) : null}

      <Link href="/account/bookings" className="text-sm underline">
        ← voltar pros meus agendamentos
      </Link>
    </main>
  );
}

async function RescheduleDateSlots({
  bookingId,
  date,
  company,
  staff,
  service,
}: {
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
        action={rescheduleMyBookingAction.bind(null, bookingId, date)}
      />
    </section>
  );
}
