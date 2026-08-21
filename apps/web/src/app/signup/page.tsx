import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/app";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <SignupForm next={next} />
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
        Já tenho conta
      </Link>
    </main>
  );
}
