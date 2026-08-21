"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanyAction } from "./actions";

type CompanyFields = {
  name: string;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};

const initialState = { error: null as string | null };

export function UpdateCompanyForm({
  companySlug,
  company,
}: {
  companySlug: string;
  company: CompanyFields;
}) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      updateCompanyAction(companySlug, formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={company.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Telefone (WhatsApp)</Label>
        <Input id="phone" name="phone" type="tel" className="font-mono-data" defaultValue={company.phone ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addressLine1">Endereço</Label>
        <Input id="addressLine1" name="addressLine1" defaultValue={company.addressLine1 ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" defaultValue={company.city ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" name="state" defaultValue={company.state ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="postalCode">CEP</Label>
        <Input id="postalCode" name="postalCode" className="font-mono-data" defaultValue={company.postalCode ?? ""} />
      </div>

      <Button type="submit" disabled={isPending} className="mt-1 h-10">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
