import { prisma } from "@scheduling-saas/database";
import { requireCompanyOwner } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { CreateStaffForm } from "./CreateStaffForm";
import { toggleStaffActiveAction } from "./actions";

export default async function StaffPage({ params }: PageProps<"/app/[companySlug]/staff">) {
  const { companySlug } = await params;
  const { company } = await requireCompanyOwner(companySlug);

  const staff = await prisma.staffProfile.findMany({
    where: { companyId: company.id },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      <CompanyNav companySlug={companySlug} />
      <section>
        <h1 className="text-xl font-semibold">Equipe — {company.name}</h1>
        {staff.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Nenhum profissional cadastrado ainda.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {staff.map((member) => {
              const toggleAction = toggleStaffActiveAction.bind(null, companySlug, member.id);
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{member.displayName}</p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                  <form action={toggleAction}>
                    <button
                      type="submit"
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        member.active
                          ? "bg-gray-100 text-gray-700"
                          : "bg-yellow-50 text-yellow-800"
                      }`}
                    >
                      {member.active ? "Ativo — desativar" : "Inativo — ativar"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cadastrar profissional</h2>
        <div className="mt-4">
          <CreateStaffForm companySlug={companySlug} />
        </div>
      </section>
    </main>
  );
}
