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
    <>
      <CompanyNav companySlug={companySlug} companyName={company.name} />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-xl font-bold">Google Calendar</h1>

        {!staff ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Só profissionais cadastrados na equipe podem conectar a própria agenda.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Conecte seu Google Calendar pessoal pra que seus agendamentos apareçam automaticamente lá,
              e pra que compromissos marcados direto no Google bloqueiem sua disponibilidade aqui.
            </p>

            {errorMessage ? (
              <p className="mt-5 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            {connection?.status === "ERROR" ? (
              <p className="mt-5 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                Google Calendar desconectado — reconecte pra continuar sincronizando sua agenda.
              </p>
            ) : null}

            {connection ? (
              <div className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-success-soft text-success">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Conectado</p>
                    <p className="font-mono-data mt-0.5 text-xs text-muted-foreground">
                      {connection.googleAccountEmail}
                    </p>
                  </div>
                </div>
                <form action={disconnectGoogleCalendarAction.bind(null, companySlug)}>
                  <button type="submit" className="text-xs text-destructive hover:underline">
                    desconectar
                  </button>
                </form>
              </div>
            ) : (
              <a
                href={`/api/google-calendar/connect?companySlug=${companySlug}`}
                className="mt-5 inline-block rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90"
              >
                Conectar Google Calendar
              </a>
            )}
          </>
        )}
      </main>
    </>
  );
}
