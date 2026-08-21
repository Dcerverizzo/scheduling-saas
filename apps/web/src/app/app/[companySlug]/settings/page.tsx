import { requireCompanyOwner } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { UpdateCompanyForm } from "./UpdateCompanyForm";

export default async function CompanySettingsPage({
  params,
}: PageProps<"/app/[companySlug]/settings">) {
  const { companySlug } = await params;
  const { company } = await requireCompanyOwner(companySlug);

  return (
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>

        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <UpdateCompanyForm companySlug={companySlug} company={company} />
        </div>
      </main>
    </>
  );
}
