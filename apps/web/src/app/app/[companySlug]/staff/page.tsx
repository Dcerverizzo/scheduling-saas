import { prisma } from "@scheduling-saas/database";
import { requireCompanyOwner } from "@/lib/company-context";
import { badgeVariants } from "@/components/ui/badge";
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
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} isOwner />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="text-xl font-bold">Equipe</h1>
          {staff.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum profissional cadastrado ainda.</p>
          ) : (
            <div className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {staff.map((member) => {
                const toggleAction = toggleStaffActiveAction.bind(null, companySlug, member.id);
                const initials = member.displayName.slice(0, 2).toUpperCase();
                return (
                  <div key={member.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`font-mono-data flex size-9 flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                          member.active
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {initials}
                      </span>
                      <div className={member.active ? "" : "opacity-60"}>
                        <p className="text-sm font-semibold">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <form action={toggleAction}>
                      <button
                        type="submit"
                        className={badgeVariants({ variant: member.active ? "success" : "accent" })}
                      >
                        {member.active ? "Ativo — desativar" : "Inativo — ativar"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-[15px] font-bold">Cadastrar profissional</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A senha temporária aparece uma única vez.
            </p>
            <div className="mt-5">
              <CreateStaffForm companySlug={companySlug} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
