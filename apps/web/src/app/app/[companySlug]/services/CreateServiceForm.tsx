"use client";

import { useActionState } from "react";
import { createServiceAction } from "./actions";

const initialState = { error: null as string | null };

export function CreateServiceForm({
  companySlug,
  staff,
}: {
  companySlug: string;
  staff: { id: string; displayName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      createServiceAction(companySlug, formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Nome do serviço
        <input
          type="text"
          name="name"
          required
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descrição
        <input type="text" name="description" className="rounded-md border border-gray-300 px-3 py-2" />
      </label>
      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Duração (min)
          <input
            type="number"
            name="durationMinutes"
            required
            min={5}
            step={5}
            defaultValue={30}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Buffer antes (min)
          <input
            type="number"
            name="bufferBeforeMinutes"
            min={0}
            step={5}
            defaultValue={0}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Buffer depois (min)
          <input
            type="number"
            name="bufferAfterMinutes"
            min={0}
            step={5}
            defaultValue={0}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Preço (R$)
        <input
          type="text"
          name="price"
          required
          placeholder="49.90"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      {staff.length > 0 ? (
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Quem presta esse serviço</legend>
          {staff.map((member) => (
            <label key={member.id} className="flex items-center gap-2">
              <input type="checkbox" name="staffIds" value={member.id} />
              {member.displayName}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-xs text-gray-500">
          Cadastre profissionais na aba de equipe antes de vincular serviços a eles.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Criar serviço"}
      </button>
    </form>
  );
}
