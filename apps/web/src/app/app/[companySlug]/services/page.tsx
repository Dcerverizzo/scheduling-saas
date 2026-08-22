import { prisma } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { requireCompanyContext } from "@/lib/company-context";
import { badgeVariants } from "@/components/ui/badge";
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
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} isOwner={isOwner} />
      <main
        className={`mx-auto w-full flex-1 gap-10 px-6 py-10 ${
          isOwner ? "grid max-w-5xl lg:grid-cols-[1fr_400px]" : "max-w-2xl"
        }`}
      >
        <section>
          <h1 className="text-xl font-bold">Serviços</h1>
          {services.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <div className="mt-5 flex flex-col gap-2.5">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 ${
                    service.active ? "" : "opacity-55"
                  }`}
                >
                  <div>
                    <p className="text-[15px] font-semibold">{service.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono-data text-xs text-muted-foreground">
                        {service.durationMinutes} min · R$ {formatCentsAsDecimalString(service.priceInCents)}
                      </span>
                      {service.staff.map((s) => (
                        <span
                          key={s.staffId}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {s.staff.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isOwner ? (
                    <form action={toggleServiceActiveAction.bind(null, companySlug, service.id)}>
                      <button
                        type="submit"
                        className={badgeVariants({ variant: service.active ? "success" : "accent" })}
                      >
                        {service.active ? "Ativo — desativar" : "Inativo — ativar"}
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {isOwner ? (
          <section>
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-[15px] font-bold">Novo serviço</h2>
              <div className="mt-5">
                <CreateServiceForm companySlug={companySlug} staff={staff} />
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
