import { notFound, redirect } from "next/navigation";
import { prisma } from "@scheduling-saas/database";
import { formatCentsAsDecimalString } from "@scheduling-saas/domain";
import { auth } from "@/auth";
import { ConfirmBookingForm } from "./ConfirmBookingForm";

export default async function ConfirmBookingPage({
  params,
  searchParams,
}: PageProps<"/[companySlug]/confirmar">) {
  const { companySlug } = await params;
  const search = await searchParams;
  const serviceId = typeof search.serviceId === "string" ? search.serviceId : undefined;
  const staffId = typeof search.staffId === "string" ? search.staffId : undefined;
  const startsAt = typeof search.startsAt === "string" ? search.startsAt : undefined;

  if (!serviceId || !staffId || !startsAt) {
    redirect(`/${companySlug}`);
  }

  const session = await auth();
  if (!session?.user) {
    const next = `/${companySlug}/confirmar?serviceId=${serviceId}&staffId=${staffId}&startsAt=${encodeURIComponent(startsAt)}`;
    redirect(`/signup?next=${encodeURIComponent(next)}`);
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) notFound();

  const service = await prisma.service.findFirst({ where: { id: serviceId, companyId: company.id } });
  const staff = await prisma.staffProfile.findFirst({ where: { id: staffId, companyId: company.id } });
  if (!service || !staff) notFound();

  const startDate = new Date(startsAt);
  const localTime = startDate.toLocaleString("pt-BR", { timeZone: company.timezone });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">Confirmar agendamento</h1>

      <dl className="flex flex-col gap-2 rounded-md border border-gray-200 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Empresa</dt>
          <dd>{company.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Serviço</dt>
          <dd>{service.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Profissional</dt>
          <dd>{staff.displayName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Quando</dt>
          <dd>{localTime}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Preço</dt>
          <dd>R$ {formatCentsAsDecimalString(service.priceInCents)}</dd>
        </div>
      </dl>

      <ConfirmBookingForm
        companySlug={companySlug}
        serviceId={service.id}
        staffId={staff.id}
        startsAt={startDate.toISOString()}
      />
    </main>
  );
}
