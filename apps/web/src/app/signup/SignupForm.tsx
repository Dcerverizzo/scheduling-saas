"use client";

import { useActionState } from "react";
import { customerSignupAction } from "./actions";

const initialState = { error: null as string | null };

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) => customerSignupAction(formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input type="text" name="name" required className="rounded-md border border-gray-300 px-3 py-2" />
      </label>
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
        Telefone (WhatsApp)
        <input
          type="tel"
          name="phone"
          required
          placeholder="17999999999"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
