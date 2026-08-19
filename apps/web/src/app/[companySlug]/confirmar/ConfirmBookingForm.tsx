"use client";

import { useActionState, useState } from "react";
import { confirmBookingAction } from "./actions";

const initialState = { error: null as string | null };

export function ConfirmBookingForm({
  companySlug,
  serviceId,
  staffId,
  startsAt,
}: {
  companySlug: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
}) {
  // Único por instância do formulário no cliente (não useId — esse é posicional
  // e colidiria entre usuários diferentes carregando a mesma página).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      confirmBookingAction(companySlug, formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Confirmando..." : "Confirmar agendamento"}
      </button>
    </form>
  );
}
