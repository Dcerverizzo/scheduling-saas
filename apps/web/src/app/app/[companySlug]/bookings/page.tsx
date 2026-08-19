import { prisma } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { requireCompanyContext } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { cancelCompanyBookingAction } from "./actions";

export default async function CompanyBookingsPage({
  params,
}: PageProps<"/app/[companySlug]/bookings">) {
  const { companySlug } = await params;
  const { userId, company, membership } = await requireCompanyContext(companySlug);

  let staffFilter: string | undefined;
  if (membership.role === "STAFF") {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { companyId_userId: { companyId: company.id, userId } },
    });
    staffFilter = staffProfile?.id;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      companyId: company.id,
      status: { not: "CANCELLED" },
      ...(staffFilter ? { staffId: staffFilter } : {}),
    },
    include: { staff: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <CompanyNav companySlug={companySlug} />
      <h1 className="text-xl font-semibold">
        Agenda — {company.name}
        {membership.role === "STAFF" ? " (minha agenda)" : ""}
      </h1>

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum agendamento futuro.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {booking.serviceNameSnapshot} — {booking.customerNameSnapshot}
                </p>
                <p className="text-gray-500">
                  {booking.staff.displayName} ·{" "}
                  {booking.startsAt.toLocaleString("pt-BR", { timeZone: company.timezone })} · R${" "}
                  {formatCentsAsDecimalString(booking.servicePriceSnapshot)} · {booking.status}
                </p>
              </div>
              <form action={cancelCompanyBookingAction.bind(null, companySlug, booking.id)}>
                <button type="submit" className="text-xs text-red-600 underline">
                  cancelar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
