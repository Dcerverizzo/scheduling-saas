"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service-name">Nome do serviço</Label>
        <Input id="service-name" name="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service-description">Descrição</Label>
        <Input id="service-description" name="description" placeholder="Opcional" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duration">Duração (min)</Label>
          <Input id="duration" name="durationMinutes" type="number" required min={5} step={5} defaultValue={30} className="font-mono-data" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bufferBefore">Buffer antes</Label>
          <Input id="bufferBefore" name="bufferBeforeMinutes" type="number" min={0} step={5} defaultValue={0} className="font-mono-data" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bufferAfter">Buffer depois</Label>
          <Input id="bufferAfter" name="bufferAfterMinutes" type="number" min={0} step={5} defaultValue={0} className="font-mono-data" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="price">Preço (R$)</Label>
        <Input id="price" name="price" required placeholder="49,90" className="font-mono-data" />
      </div>

      {staff.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Quem presta esse serviço</legend>
          {staff.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="staffIds" value={member.id} className="accent-primary" />
              {member.displayName}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-xs text-muted-foreground">
          Cadastre profissionais na aba de equipe antes de vincular serviços a eles.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="mt-1 h-10">
        {isPending ? "Salvando..." : "Criar serviço"}
      </Button>
    </form>
  );
}
