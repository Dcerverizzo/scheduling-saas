import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold">Defina sua senha</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Você está usando uma senha temporária. Escolha uma nova senha para continuar.
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
