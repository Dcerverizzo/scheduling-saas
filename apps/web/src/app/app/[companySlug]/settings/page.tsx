import { requireCompanyOwner } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { UpdateCompanyForm } from "./UpdateCompanyForm";

export default async function CompanySettingsPage({
  params,
}: PageProps<"/app/[companySlug]/settings">) {
  const { companySlug } = await params;
  const { company } = await requireCompanyOwner(companySlug);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <CompanyNav companySlug={companySlug} />
      <h1 className="text-xl font-semibold">Configurações — {company.name}</h1>

      <UpdateCompanyForm companySlug={companySlug} company={company} />
    </main>
  );
}
