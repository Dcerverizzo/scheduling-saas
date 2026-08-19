"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";

const initialState = { error: null as string | null };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) => changePasswordAction(formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Nova senha
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Confirmar nova senha
        <input
          type="password"
          name="confirmPassword"
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
        {isPending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
