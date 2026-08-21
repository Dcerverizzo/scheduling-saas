import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@scheduling-saas/database";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { badgeVariants } from "@/components/ui/badge";
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
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-6 py-14 lg:grid-cols-[1fr_400px]">
      <section>
        <h1 className="text-2xl font-bold">Minhas empresas</h1>
        <p className="mt-1 text-sm text-muted-foreground">As empresas onde você tem algum papel.</p>

        {memberships.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Você ainda não faz parte de nenhuma empresa.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-2.5">
            {memberships.map((membership) => (
              <Link
                key={membership.id}
                href={`/app/${membership.company.slug}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 hover:border-primary/40"
              >
                <div className="flex items-center gap-3.5">
                  <span className="font-mono-data flex size-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
                    {membership.company.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold">{membership.company.name}</p>
                    <p className="font-mono-data mt-0.5 text-xs text-muted-foreground">
                      /{membership.company.slug}
                    </p>
                  </div>
                </div>
                <span className={badgeVariants({ variant: "solid" })}>{membership.role}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-[15px] font-bold">Criar nova empresa</h2>
          <p className="mt-1 text-xs text-muted-foreground">Leva menos de um minuto.</p>

          {"error" in params ? (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Não foi possível criar a empresa. Confira os dados e tente novamente.
            </p>
          ) : null}

          <form action={createCompanyAction} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name">Nome da empresa</Label>
              <Input id="company-name" name="name" required placeholder="Ex: Salão Corte Fino" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-phone">Telefone (WhatsApp)</Label>
              <Input
                id="company-phone"
                name="phone"
                type="tel"
                placeholder="+5517999999000"
                className="font-mono-data"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-timezone">Fuso horário</Label>
              <Input
                id="company-timezone"
                name="timezone"
                defaultValue="America/Sao_Paulo"
                className="font-mono-data"
              />
            </div>
            <Button type="submit" className="mt-1 h-10">
              Criar empresa
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
