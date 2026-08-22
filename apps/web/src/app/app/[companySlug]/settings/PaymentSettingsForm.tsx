"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePaymentSettingsAction } from "./actions";

type PaymentRequirement = "NONE" | "DEPOSIT" | "FULL";

const initialState = { error: null as string | null };

export function PaymentSettingsForm({
  companySlug,
  paymentRequirement,
  depositPercentage,
}: {
  companySlug: string;
  paymentRequirement: PaymentRequirement;
  depositPercentage: number | null;
}) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      updatePaymentSettingsAction(companySlug, formData),
    initialState,
  );
  const [requirement, setRequirement] = useState<PaymentRequirement>(paymentRequirement);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentRequirement">Exigir pagamento no agendamento</Label>
        <select
          id="paymentRequirement"
          name="paymentRequirement"
          value={requirement}
          onChange={(event) => setRequirement(event.target.value as PaymentRequirement)}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
        >
          <option value="NONE">Não exigir — cliente agenda sem pagar</option>
          <option value="DEPOSIT">Sinal — cliente paga um % antecipado</option>
          <option value="FULL">Integral — cliente paga o valor todo antecipado</option>
        </select>
      </div>

      {requirement === "DEPOSIT" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="depositPercentage">Percentual do sinal</Label>
          <Input
            id="depositPercentage"
            name="depositPercentage"
            type="number"
            min={1}
            max={99}
            className="font-mono-data"
            defaultValue={depositPercentage ?? ""}
            required
          />
        </div>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-1 h-10">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
