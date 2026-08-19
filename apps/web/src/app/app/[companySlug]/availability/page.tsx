import { prisma } from "@scheduling-saas/database";
import { requireCompanyOwner } from "@/lib/company-context";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      <CompanyNav companySlug={companySlug} />

      {staff.length === 0 ? (
        <p className="text-sm text-gray-600">
          Cadastre profissionais antes de configurar a disponibilidade.
        </p>
      ) : (
        <>
          <section>
            <h1 className="text-xl font-semibold">Disponibilidade — {company.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Horários em fuso {company.timezone}.
            </p>

            {rules.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">Nenhum horário recorrente cadastrado.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span>
                      {rule.staff.displayName} — {WEEKDAYS[rule.dayOfWeek]} {rule.startTime}–
                      {rule.endTime}
                    </span>
                    <form action={deleteAvailabilityRuleAction.bind(null, companySlug, rule.id)}>
                      <button type="submit" className="text-xs text-red-600 underline">
                        remover
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <CreateRuleForm companySlug={companySlug} staff={staff} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Exceções (folgas, feriados, disponibilidade extra)</h2>

            {exceptions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">Nenhuma exceção cadastrada.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {exceptions.map((exception) => (
                  <li
                    key={exception.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span>
                      {exception.staff.displayName} —{" "}
                      {exception.type === "BLOCK" ? "Bloqueio" : "Disponível"}{" "}
                      {exception.startsAt.toLocaleString("pt-BR", { timeZone: company.timezone })} →{" "}
                      {exception.endsAt.toLocaleString("pt-BR", { timeZone: company.timezone })}
                      {exception.reason ? ` (${exception.reason})` : ""}
                    </span>
                    <form
                      action={deleteAvailabilityExceptionAction.bind(
                        null,
                        companySlug,
                        exception.id,
                      )}
                    >
                      <button type="submit" className="text-xs text-red-600 underline">
                        remover
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <CreateExceptionForm companySlug={companySlug} staff={staff} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
