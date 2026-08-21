"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="rounded-md border border-dashed border-stamp bg-stamp/5 px-4 py-3.5">
          <p className="font-mono-data text-[10.5px] font-bold uppercase tracking-wide text-stamp">
            Senha temporária — {state.staffEmail}
          </p>
          <p className="font-mono-data mt-1.5 text-lg font-bold tracking-wide">{state.tempPassword}</p>
          <p className="mt-1.5 text-[11.5px] text-stamp/80">
            Repasse manualmente — não vai aparecer de novo.
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-name">Nome</Label>
          <Input id="staff-name" name="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-email">E-mail</Label>
          <Input id="staff-email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-phone">Telefone (WhatsApp)</Label>
          <Input id="staff-phone" name="phone" type="tel" className="font-mono-data" placeholder="+5517999999000" />
        </div>
        <Button type="submit" disabled={isPending} className="mt-1 h-10">
          {isPending ? "Cadastrando..." : "Cadastrar profissional"}
        </Button>
      </form>
    </div>
  );
}
