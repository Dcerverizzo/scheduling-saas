import { prisma } from "@scheduling-saas/database";
import { requireCompanyOwner } from "@/lib/company-context";
import { badgeVariants } from "@/components/ui/badge";
import { CompanyNav } from "../CompanyNav";
import { CreateExceptionForm, CreateRuleForm } from "./AvailabilityForms";
import { deleteAvailabilityExceptionAction, deleteAvailabilityRuleAction } from "./actions";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function AvailabilityPage({
  params,
}: PageProps<"/app/[companySlug]/availability">) {
  const { companySlug } = await params;
  const { company } = await requireCompanyOwner(companySlug);

  const [staff, rules, exceptions] = await Promise.all([
    prisma.staffProfile.findMany({
      where: { companyId: company.id, active: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.availabilityRule.findMany({
      where: { companyId: company.id, active: true },
      include: { staff: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { companyId: company.id },
      include: { staff: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre profissionais antes de configurar a disponibilidade.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-bold">Disponibilidade</h1>
              <span className="font-mono-data text-xs text-muted-foreground">
                horários em {company.timezone}
              </span>
            </div>

            <section className="mt-8">
              <h2 className="text-[15px] font-bold">Horários recorrentes</h2>

              {rules.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum horário recorrente cadastrado.</p>
              ) : (
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span>
                        <strong className="font-semibold">{rule.staff.displayName}</strong> ·{" "}
                        {WEEKDAYS[rule.dayOfWeek]}{" "}
                        <span className="font-mono-data text-muted-foreground">
                          {rule.startTime}–{rule.endTime}
                        </span>
                      </span>
                      <form action={deleteAvailabilityRuleAction.bind(null, companySlug, rule.id)}>
                        <button type="submit" className="text-xs text-destructive hover:underline">
                          remover
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-lg border border-border bg-card p-5">
                <CreateRuleForm companySlug={companySlug} staff={staff} />
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-[15px] font-bold">Exceções</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Folgas, feriados ou disponibilidade extra fora da regra padrão.
              </p>

              {exceptions.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma exceção cadastrada.</p>
              ) : (
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {exceptions.map((exception) => (
                    <div
                      key={exception.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={badgeVariants({
                            variant: exception.type === "BLOCK" ? "stamp" : "accent",
                          })}
                        >
                          {exception.type === "BLOCK" ? "Bloqueio" : "Extra"}
                        </span>
                        <strong className="font-semibold">{exception.staff.displayName}</strong>
                        <span className="font-mono-data text-muted-foreground">
                          {exception.startsAt.toLocaleString("pt-BR", { timeZone: company.timezone })} →{" "}
                          {exception.endsAt.toLocaleString("pt-BR", { timeZone: company.timezone })}
                        </span>
                        {exception.reason ? <span className="text-muted-foreground">— {exception.reason}</span> : null}
                      </span>
                      <form
                        action={deleteAvailabilityExceptionAction.bind(null, companySlug, exception.id)}
                      >
                        <button type="submit" className="text-xs text-destructive hover:underline">
                          remover
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-lg border border-border bg-card p-5">
                <CreateExceptionForm companySlug={companySlug} staff={staff} />
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
