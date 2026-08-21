import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-12">
      {confirmed ? (
        <p className="rounded-md bg-success-soft px-3 py-2.5 text-sm text-success">
          Agendamento confirmado!
        </p>
      ) : null}

      <section>
        <h1 className="text-xl font-bold">Meus agendamentos</h1>

        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="relative overflow-hidden rounded-md bg-card py-4 pr-4 pl-5 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-3.5 before:border-r before:border-dashed before:border-border before:[background-image:radial-gradient(circle_3px,var(--background)_3px,transparent_3.5px)] before:[background-position:center_0] before:[background-size:14px_14px]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold">
                      {booking.serviceNameSnapshot} — {booking.company.name}
                    </p>
                    <p className="font-mono-data mt-1 text-xs text-muted-foreground">
                      {booking.startsAt.toLocaleString("pt-BR", { timeZone: booking.company.timezone })} · R${" "}
                      {formatCentsAsDecimalString(booking.servicePriceSnapshot)}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-4">
                  <Link
                    href={`/account/bookings/${booking.id}/reschedule`}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    reagendar
                  </Link>
                  <form action={cancelMyBookingAction.bind(null, booking.id)}>
                    <button type="submit" className="text-xs text-destructive underline underline-offset-2">
                      cancelar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Histórico</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum agendamento anterior.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {history.map((booking) => (
              <li
                key={booking.id}
                className={`flex items-center justify-between gap-3 border-b border-dotted border-border py-2.5 text-sm ${
                  booking.status === "CANCELLED" ? "text-muted-foreground/60 line-through" : "text-muted-foreground"
                }`}
              >
                <span>
                  {booking.company.name} — {booking.serviceNameSnapshot}
                </span>
                <span className="font-mono-data flex-none">
                  {booking.status === "CANCELLED"
                    ? "CANCELADO"
                    : booking.startsAt.toLocaleDateString("pt-BR", { timeZone: booking.company.timezone })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
