import { prisma } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { requireSession } from "@/lib/session";
import { cancelMyBookingAction } from "./actions";

export default async function MyBookingsPage({ searchParams }: PageProps<"/account/bookings">) {
  const session = await requireSession();
  const params = await searchParams;
  const confirmed = typeof params.confirmed === "string" ? params.confirmed : undefined;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
  });

  const bookings = customer
    ? await prisma.booking.findMany({
        where: { customerId: customer.id },
        include: { company: true },
        orderBy: { startsAt: "desc" },
      })
    : [];

  const now = new Date();
  const upcoming = bookings.filter(
    (booking) => booking.startsAt >= now && booking.status !== "CANCELLED",
  );
  const history = bookings.filter(
    (booking) => booking.startsAt < now || booking.status === "CANCELLED",
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      {confirmed ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Agendamento confirmado!
        </p>
      ) : null}

      <section>
        <h1 className="text-xl font-semibold">Meus agendamentos</h1>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Nenhum agendamento futuro.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {booking.company.name} — {booking.serviceNameSnapshot}
                  </p>
                  <p className="text-gray-500">
                    {booking.startsAt.toLocaleString("pt-BR", { timeZone: booking.company.timezone })} · R${" "}
                    {formatCentsAsDecimalString(booking.servicePriceSnapshot)}
                  </p>
                </div>
                <form action={cancelMyBookingAction.bind(null, booking.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    cancelar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Histórico</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Nenhum agendamento anterior.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {history.map((booking) => (
              <li key={booking.id} className="rounded-md border border-gray-100 px-3 py-2 text-sm text-gray-500">
                {booking.company.name} — {booking.serviceNameSnapshot} —{" "}
                {booking.startsAt.toLocaleString("pt-BR", { timeZone: booking.company.timezone })} —{" "}
                {booking.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
