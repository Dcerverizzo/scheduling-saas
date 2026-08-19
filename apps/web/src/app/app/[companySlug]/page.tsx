import { redirect } from "next/navigation";
import { requireCompanyContext } from "@/lib/company-context";

// Sem "home" própria — a agenda é a visão natural ao entrar numa empresa.
export default async function CompanyIndexPage({
  params,
}: PageProps<"/app/[companySlug]">) {
  const { companySlug } = await params;
  await requireCompanyContext(companySlug);
  redirect(`/app/${companySlug}/bookings`);
}
