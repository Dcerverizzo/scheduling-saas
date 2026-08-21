import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { auth } from "@/auth";
import { ConfirmBookingForm } from "./ConfirmBookingForm";
import { GuestBookingForm } from "./GuestBookingForm";

export default async function ConfirmBookingPage({
  params,
  searchParams,
}: PageProps<"/[companySlug]/confirmar">) {
  const { companySlug } = await params;
  const search = await searchParams;
  const serviceId = typeof search.serviceId === "string" ? search.serviceId : undefined;
  const staffId = typeof search.staffId === "string" ? search.staffId : undefined;
  const startsAt = typeof search.startsAt === "string" ? search.startsAt : undefined;

  if (!serviceId || !staffId || !startsAt) {
    redirect(`/${companySlug}`);
  }

  const session = await auth();

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) notFound();

  const service = await prisma.service.findFirst({ where: { id: serviceId, companyId: company.id } });
  const staff = await prisma.staffProfile.findFirst({ where: { id: staffId, companyId: company.id } });
  if (!service || !staff) notFound();

  const startDate = new Date(startsAt);
  const localDate = startDate.toLocaleDateString("pt-BR", { timeZone: company.timezone });
  const localTime = startDate.toLocaleTimeString("pt-BR", {
    timeZone: company.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Preserva a seleção pra quem decidir entrar/criar conta em vez de continuar sem ela.
  const nextPath = `/${companySlug}/confirmar?serviceId=${service.id}&staffId=${staff.id}&startsAt=${encodeURIComponent(startDate.toISOString())}`;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 pt-6 pb-12">
      <Link
        href={`/${companySlug}?serviceId=${service.id}&staffId=${staff.id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← trocar horário
      </Link>
      <h1 className="text-lg font-bold">Confirmar agendamento</h1>

      <div className="overflow-hidden rounded-md bg-card shadow-[0_16px_34px_-20px_rgba(35,36,31,0.4)]">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <p className="font-mono-data text-[10.5px] tracking-wide text-muted-foreground">TICKET</p>
            <p className="mt-1.5 text-lg font-bold">{company.name}</p>
          </div>
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-foreground text-background">
            ✓
          </span>
        </div>

        <div className="ticket-perforation" />

        <dl className="flex flex-col gap-0 px-5">
          <TicketRow label="Serviço" value={service.name} />
          <TicketRow label="Profissional" value={staff.displayName} />
          <TicketRow label="Quando" value={`${localDate} · ${localTime}`} mono />
          <TicketRow label="Duração" value={`${service.durationMinutes} min`} mono />
          <TicketRow
            label="Valor"
            value={`R$ ${formatCentsAsDecimalString(service.priceInCents)}`}
            last={!session?.user}
            big
          />
        </dl>

        {session?.user ? (
          <>
            <div className="ticket-perforation" />
            <div className="flex items-center justify-between px-5 pt-3.5 pb-5">
              <span className="font-mono-data text-[11px] text-muted-foreground">EMITIDO PARA</span>
              <span className="text-[13.5px] font-semibold">{session.user.name}</span>
            </div>
          </>
        ) : (
          <div className="pb-4" />
        )}
      </div>

      {session?.user ? (
        <ConfirmBookingForm
          companySlug={companySlug}
          serviceId={service.id}
          staffId={staff.id}
          startsAt={startDate.toISOString()}
        />
      ) : (
        <>
          <GuestBookingForm
            companySlug={companySlug}
            serviceId={service.id}
            staffId={staff.id}
            startsAt={startDate.toISOString()}
          />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex justify-center gap-5 text-sm">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="text-primary underline underline-offset-2"
            >
              Já tenho conta
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(nextPath)}`}
              className="text-primary underline underline-offset-2"
            >
              Criar conta
            </Link>
          </div>
        </>
      )}

      <p className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
        <span className="mt-0.5 flex size-4 flex-none items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
          ✓
        </span>
        A confirmação e o lembrete chegam no seu WhatsApp — não precisa guardar print.
      </p>
    </main>
  );
}

function TicketRow({
  label,
  value,
  mono,
  big,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  big?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between py-2.5 ${last ? "" : "border-b border-dotted border-border"}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-right font-semibold ${mono ? "font-mono-data" : ""} ${big ? "text-[17px]" : "text-sm"}`}>
        {value}
      </dd>
    </div>
  );
}
