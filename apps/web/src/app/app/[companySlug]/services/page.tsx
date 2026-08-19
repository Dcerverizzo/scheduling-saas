import { prisma } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { requireCompanyContext } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { CreateServiceForm } from "./CreateServiceForm";
import { toggleServiceActiveAction } from "./actions";

export default async function ServicesPage({
  params,
}: PageProps<"/app/[companySlug]/services">) {
  const { companySlug } = await params;
  const { company, membership } = await requireCompanyContext(companySlug);
  const isOwner = membership.role === "OWNER";

  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { companyId: company.id },
      include: { staff: { include: { staff: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staffProfile.findMany({
      where: { companyId: company.id, active: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      <CompanyNav companySlug={companySlug} />
      <section>
        <h1 className="text-xl font-semibold">Serviços — {company.name}</h1>
        {services.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {services.map((service) => (
              <li key={service.id} className="rounded-md border border-gray-200 px-3 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-gray-500">
                      {service.durationMinutes} min · R${" "}
                      {formatCentsAsDecimalString(service.priceInCents)}
                      {service.staff.length > 0
                        ? ` · ${service.staff.map((s) => s.staff.displayName).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  {isOwner ? (
                    <form action={toggleServiceActiveAction.bind(null, companySlug, service.id)}>
                      <button
                        type="submit"
                        className={`rounded-md px-3 py-1 text-xs font-medium ${
                          service.active
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-50 text-yellow-800"
                        }`}
                      >
                        {service.active ? "Ativo — desativar" : "Inativo — ativar"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner ? (
        <section>
          <h2 className="text-lg font-semibold">Novo serviço</h2>
          <div className="mt-4">
            <CreateServiceForm companySlug={companySlug} staff={staff} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
