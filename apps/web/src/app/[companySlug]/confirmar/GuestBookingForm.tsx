"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmGuestBookingAction } from "./actions";

const initialState = { error: null as string | null };

export function GuestBookingForm({
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
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      confirmGuestBookingAction(companySlug, formData),
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

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="guest-name">
          Nome
        </label>
        <input id="guest-name" type="text" name="name" required className="field-underline" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="guest-phone">
          Telefone (WhatsApp)
        </label>
        <input
          id="guest-phone"
          type="tel"
          name="phone"
          required
          placeholder="17999999999"
          className="field-underline font-mono-data"
        />
      </div>

      <Button type="submit" variant="stamp" disabled={isPending} className="h-12 text-[15.5px] font-bold">
        {isPending ? "Confirmando..." : "Confirmar sem conta"}
      </Button>
    </form>
  );
}
