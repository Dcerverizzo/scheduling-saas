import { prisma } from "@scheduling-saas/database";
import { requireCompanyContext } from "@/lib/company-context";
import { CompanyNav } from "../CompanyNav";
import { disconnectGoogleCalendarAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Você cancelou a conexão no Google.",
  missing_code: "O Google não retornou o código de autorização — tente novamente.",
  missing_refresh_token:
    "O Google não concedeu acesso contínuo. Em myaccount.google.com/permissions, remova o acesso do app e tente conectar de novo.",
};

export default async function GoogleCalendarPage({
  params,
  searchParams,
}: PageProps<"/app/[companySlug]/google-calendar">) {
  const { companySlug } = await params;
  const search = await searchParams;
  const { userId, company } = await requireCompanyContext(companySlug);

  const staff = await prisma.staffProfile.findUnique({
    where: { companyId_userId: { companyId: company.id, userId } },
    include: { googleCalendarConnection: true },
  });

  const errorParam = typeof search.error === "string" ? search.error : undefined;
  const errorMessage = errorParam ? (ERROR_MESSAGES[errorParam] ?? errorParam) : null;
  const connection = staff?.googleCalendarConnection ?? null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      <CompanyNav companySlug={companySlug} />
      <section>
        <h1 className="text-xl font-semibold">Google Calendar</h1>

        {!staff ? (
          <p className="mt-2 text-sm text-gray-600">
            Só profissionais cadastrados na equipe podem conectar a própria agenda.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Conecte seu Google Calendar pessoal pra que seus agendamentos apareçam
              automaticamente lá, e pra que compromissos marcados direto no Google bloqueiem
              sua disponibilidade aqui.
            </p>

            {errorMessage ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {connection?.status === "ERROR" ? (
              <p className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                Google Calendar desconectado — reconecte pra continuar sincronizando sua agenda.
              </p>
            ) : null}

            {connection ? (
              <div className="mt-4 flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Conectado</p>
                  <p className="text-xs text-gray-500">{connection.googleAccountEmail}</p>
                </div>
                <form action={disconnectGoogleCalendarAction.bind(null, companySlug)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    desconectar
                  </button>
                </form>
              </div>
            ) : (
              // Navegação real de servidor (não SPA) — precisa seguir o redirect 302 pro
              // Google, então é <a>, não <Link> (mesmo critério do Step 6 pra links
              // externos: eslint-config-next não marca isso porque a rota não é uma page).
              <a
                href={`/api/google-calendar/connect?companySlug=${companySlug}`}
                className="mt-4 inline-block rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
              >
                Conectar Google Calendar
              </a>
            )}
          </>
        )}
      </section>
    </main>
  );
}
