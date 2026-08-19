"use client";

import { useActionState } from "react";
import { createStaffAction } from "./actions";

type State = { error: string | null; tempPassword?: string; staffEmail?: string };

const initialState: State = { error: null };

export function CreateStaffForm({ companySlug }: { companySlug: string }) {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    (_prevState, formData) => createStaffAction(companySlug, formData),
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      {state.tempPassword ? (
        <div className="rounded-md bg-green-50 px-3 py-3 text-sm text-green-800">
          <p>
            Profissional <strong>{state.staffEmail}</strong> cadastrado. Senha temporária
            (repasse manualmente, ela não será mostrada de novo):
          </p>
          <p className="mt-2 rounded bg-white px-2 py-1 font-mono text-base">
            {state.tempPassword}
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            type="text"
            name="name"
            required
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email"
            name="email"
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
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Cadastrando..." : "Cadastrar profissional"}
        </button>
      </form>
    </div>
  );
}
