import { requireCompanyOwner } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { UpdateCompanyForm } from "./UpdateCompanyForm";
import { PaymentSettingsForm } from "./PaymentSettingsForm";

export default async function CompanySettingsPage({
  params,
}: PageProps<"/app/[companySlug]/settings">) {
  const { companySlug } = await params;
  const { company } = await requireCompanyOwner(companySlug);

  return (
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} isOwner />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>

        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <UpdateCompanyForm companySlug={companySlug} company={company} />
        </div>

        <h2 className="mt-10 text-[15px] font-bold">Pagamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura se o cliente precisa pagar pelo Mercado Pago pra confirmar o agendamento.
        </p>
        <div className="mt-4 rounded-lg border border-border bg-card p-6">
          <PaymentSettingsForm
            companySlug={companySlug}
            paymentRequirement={company.paymentRequirement}
            depositPercentage={company.depositPercentage}
          />
        </div>
      </main>
    </>
  );
}
