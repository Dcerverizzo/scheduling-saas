import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

async function loginAction(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const hasError = "error" in params;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Acesse sua conta pra ver seus agendamentos ou gerenciar sua empresa.
        </p>
      </div>

      {hasError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          E-mail ou senha incorretos.
        </p>
      ) : null}

      <form action={loginAction} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className="field-underline"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="field-underline"
          />
        </div>

        <Button type="submit" className="mt-1 h-11 text-[15px]">
          Entrar
        </Button>
      </form>

      <Link href="/signup" className="text-center text-sm text-muted-foreground">
        Ainda não tem conta — <span className="font-medium text-primary">Criar conta</span>
      </Link>
    </main>
  );
}
