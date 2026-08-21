import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { DateTime } from "luxon";
import { prisma, type Company, type Service, type StaffProfile } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { getSlotsForStaff } from "@/lib/booking/get-slots-for-staff";
import { checkRateLimit } from "@/lib/rate-limit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

const STEPS = ["Serviço", "Profissional", "Data", "Horário"] as const;

function Stepper({ current }: { current: number }) {
  return (
    <div className="font-mono-data flex flex-wrap items-center gap-1.5 text-[10.5px] tracking-wide">
      {STEPS.map((label, index) => (
        <span key={label} className="flex items-center gap-1.5">
          {index > 0 ? <span className="text-border">→</span> : null}
          <span
            className={
              index === current
                ? "border-b-2 border-primary pb-2 font-bold text-foreground"
                : "pb-2 text-muted-foreground"
            }
          >
            {label.toUpperCase()}
          </span>
        </span>
      ))}
    </div>
  );
}

export default async function PublicCompanyPage({
  params,
  searchParams,
}: PageProps<"/[companySlug]">) {
  const { companySlug } = await params;
  const search = await searchParams;
  const serviceId = typeof search.serviceId === "string" ? search.serviceId : undefined;
  const staffId = typeof search.staffId === "string" ? search.staffId : undefined;
  const date = typeof search.date === "string" ? search.date : undefined;

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company || company.deletedAt) {
    notFound();
  }

  const service = serviceId
    ? await prisma.service.findFirst({
        where: { id: serviceId, companyId: company.id, active: true, deletedAt: null },
      })
    : null;

  const staff =
    service && staffId
      ? await prisma.staffProfile.findFirst({
          where: { id: staffId, companyId: company.id, active: true },
        })
      : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-6 pb-10">
      <div>
        <h1 className="text-[17px] font-bold">{company.name}</h1>
        {company.addressLine1 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {company.addressLine1}
            {company.city ? `, ${company.city}` : ""}
          </p>
        ) : null}
      </div>

      <div className="mt-6 border-b border-border pb-0">
        <Stepper current={!service ? 0 : !staff ? 1 : !date ? 2 : 3} />
      </div>

      <div className="mt-6">
        {!service ? (
          <ServiceStep companyId={company.id} companySlug={companySlug} />
        ) : !staff ? (
          <StaffStep companyId={company.id} companySlug={companySlug} service={service} />
        ) : !date ? (
          <DateStep companySlug={companySlug} serviceId={service.id} staffId={staff.id} />
        ) : (
          <TimeStep
            company={company}
            service={service}
            staff={staff}
            companySlug={companySlug}
            date={date}
          />
        )}
      </div>
    </main>
  );
}

async function ServiceStep({
  companyId,
  companySlug,
}: {
  companyId: string;
  companySlug: string;
}) {
  const services = await prisma.service.findMany({
    where: { companyId, active: true, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <section>
      <h2 className="text-lg font-bold">Escolha o serviço</h2>
      {services.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum serviço disponível no momento.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {services.map((service) => (
            <li key={service.id}>
              <Link
                href={`/${companySlug}${qs({ serviceId: service.id })}`}
                className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3.5 hover:border-primary"
              >
                <span className="text-[15px] font-medium">{service.name}</span>
                <span className="font-mono-data text-sm text-muted-foreground">
                  {service.durationMinutes}min · R$ {formatCentsAsDecimalString(service.priceInCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function StaffStep({
  companyId,
  companySlug,
  service,
}: {
  companyId: string;
  companySlug: string;
  service: { id: string; name: string };
}) {
  const staffLinks = await prisma.serviceStaff.findMany({
    where: { serviceId: service.id, staff: { companyId, active: true } },
    include: { staff: true },
  });

  return (
    <section>
      <p className="text-sm text-muted-foreground">Serviço: {service.name}</p>
      <h2 className="mt-1 text-lg font-bold">Escolha o profissional</h2>
      {staffLinks.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum profissional disponível pra esse serviço.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {staffLinks.map((link) => (
            <li key={link.staffId}>
              <Link
                href={`/${companySlug}${qs({ serviceId: service.id, staffId: link.staffId })}`}
                className="block rounded-md border border-border bg-card px-4 py-3.5 text-[15px] font-medium hover:border-primary"
              >
                {link.staff.displayName}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/${companySlug}`} className="mt-5 inline-block text-sm text-muted-foreground hover:underline">
        ← trocar serviço
      </Link>
    </section>
  );
}

function DateStep({
  companySlug,
  serviceId,
  staffId,
}: {
  companySlug: string;
  serviceId: string;
  staffId: string;
}) {
  const today = DateTime.now().toISODate();

  return (
    <section>
      <h2 className="text-lg font-bold">Escolha a data</h2>
      <form action={`/${companySlug}`} method="get" className="mt-4 flex items-end gap-3">
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="staffId" value={staffId} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="date">
            Data
          </label>
          <Input id="date" type="date" name="date" required min={today ?? undefined} className="font-mono-data" />
        </div>
        <Button type="submit">Ver horários</Button>
      </form>
      <Link
        href={`/${companySlug}${qs({ serviceId })}`}
        className="mt-5 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← trocar profissional
      </Link>
    </section>
  );
}

async function TimeStep({
  company,
  service,
  staff,
  companySlug,
  date,
}: {
  company: Company;
  service: Service;
  staff: StaffProfile;
  companySlug: string;
  date: string;
}) {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit({
    key: `availability:${ip}:${company.id}`,
    limit: 30,
    windowSeconds: 60,
  });

  const slots = allowed ? await getSlotsForStaff({ company, service, staff, date }) : [];

  return (
    <section>
      <p className="text-sm text-muted-foreground">
        {staff.displayName} — {date}
      </p>
      <h2 className="mt-1 text-lg font-bold">Escolha o horário</h2>
      {!allowed ? (
        <p className="mt-3 text-sm text-muted-foreground">Muitas requisições, tente novamente em instantes.</p>
      ) : slots.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum horário disponível nesse dia.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const localTime = slot.toLocaleTimeString("pt-BR", {
              timeZone: company.timezone,
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li key={slot.toISOString()}>
                <Link
                  href={`/${companySlug}/confirmar${qs({
                    serviceId: service.id,
                    staffId: staff.id,
                    startsAt: slot.toISOString(),
                  })}`}
                  className="font-mono-data block rounded-md border border-border bg-card py-2.5 text-center text-sm font-semibold hover:border-primary hover:text-primary"
                >
                  {localTime}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href={`/${companySlug}${qs({ serviceId: service.id, staffId: staff.id })}`}
        className="mt-5 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← trocar data
      </Link>
    </section>
  );
}
