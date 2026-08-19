import { notFound } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { prisma, type Company, type Service, type StaffProfile } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { getSlotsForStaff } from "@/lib/booking/get-slots-for-staff";

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold">{company.name}</h1>
        {company.addressLine1 ? (
          <p className="text-sm text-gray-500">
            {company.addressLine1}
            {company.city ? `, ${company.city}` : ""}
          </p>
        ) : null}
      </div>

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
      <h2 className="text-lg font-medium">Escolha o serviço</h2>
      {services.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nenhum serviço disponível no momento.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {services.map((service) => (
            <li key={service.id}>
              <Link
                href={`/${companySlug}${qs({ serviceId: service.id })}`}
                className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 hover:border-gray-400"
              >
                <span>{service.name}</span>
                <span className="text-sm text-gray-500">
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
      <p className="text-sm text-gray-500">Serviço: {service.name}</p>
      <h2 className="mt-1 text-lg font-medium">Escolha o profissional</h2>
      {staffLinks.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nenhum profissional disponível pra esse serviço.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {staffLinks.map((link) => (
            <li key={link.staffId}>
              <Link
                href={`/${companySlug}${qs({ serviceId: service.id, staffId: link.staffId })}`}
                className="block rounded-md border border-gray-200 px-4 py-3 hover:border-gray-400"
              >
                {link.staff.displayName}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/${companySlug}`} className="mt-4 inline-block text-sm underline">
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
      <h2 className="text-lg font-medium">Escolha a data</h2>
      <form action={`/${companySlug}`} method="get" className="mt-4 flex items-end gap-4">
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="staffId" value={staffId} />
        <label className="flex flex-col gap-1 text-sm">
          Data
          <input
            type="date"
            name="date"
            required
            min={today ?? undefined}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
          Ver horários
        </button>
      </form>
      <Link
        href={`/${companySlug}${qs({ serviceId })}`}
        className="mt-4 inline-block text-sm underline"
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
  const slots = await getSlotsForStaff({ company, service, staff, date });

  return (
    <section>
      <p className="text-sm text-gray-500">
        {staff.displayName} — {date}
      </p>
      <h2 className="mt-1 text-lg font-medium">Escolha o horário</h2>
      {slots.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nenhum horário disponível nesse dia.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-4 gap-2">
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
                  className="block rounded-md border border-gray-200 px-3 py-2 text-center text-sm hover:border-gray-400"
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
        className="mt-4 inline-block text-sm underline"
      >
        ← trocar data
      </Link>
    </section>
  );
}
