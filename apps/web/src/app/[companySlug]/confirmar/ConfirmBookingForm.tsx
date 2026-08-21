"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
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
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Button type="submit" variant="stamp" disabled={isPending} className="h-12 text-[15.5px] font-bold">
        {isPending ? "Confirmando..." : "Confirmar horário"}
      </Button>
    </form>
  );
}
