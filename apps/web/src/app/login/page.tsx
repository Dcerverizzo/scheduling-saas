import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">Entrar</h1>

      {hasError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          E-mail ou senha incorretos.
        </p>
      ) : null}

      <form action={loginAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
