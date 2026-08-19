import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@scheduling-saas/database";
import { requireSession } from "@/lib/session";
import { createCompanyAction } from "./actions";

export default async function AppHomePage({ searchParams }: PageProps<"/app">) {
  const session = await requireSession();
  const params = await searchParams;

  const memberships = await prisma.companyMember.findMany({
    where: { userId: session.user.id },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });

  // Usuário puramente cliente (sem nenhuma empresa) não tem o que fazer aqui —
  // manda direto pros agendamentos dele.
  if (memberships.length === 0) {
    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (customer) {
      redirect("/account/bookings");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      <section>
        <h1 className="text-xl font-semibold">Minhas empresas</h1>
        {memberships.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Você ainda não faz parte de nenhuma empresa.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {memberships.map((membership) => (
              <li key={membership.id}>
                <Link
                  href={`/app/${membership.company.slug}`}
                  className="text-sm underline underline-offset-2"
                >
                  {membership.company.name} — {membership.role}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Criar nova empresa</h2>
        {"error" in params ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Não foi possível criar a empresa. Confira os dados e tente novamente.
          </p>
        ) : null}
        <form action={createCompanyAction} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Nome da empresa
            <input
              type="text"
              name="name"
              required
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Telefone (WhatsApp)
            <input
              type="tel"
              name="phone"
              placeholder="+5517999999000"
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Fuso horário
            <input
              type="text"
              name="timezone"
              defaultValue="America/Sao_Paulo"
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
          >
            Criar empresa
          </button>
        </form>
      </section>
    </main>
  );
}
