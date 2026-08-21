"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAvailabilityExceptionAction, createAvailabilityRuleAction } from "./actions";

const initialState = { error: null as string | null };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const selectClassName =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

export function CreateRuleForm({
  companySlug,
  staff,
}: {
  companySlug: string;
  staff: { id: string; displayName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      createAvailabilityRuleAction(companySlug, formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-staff">Profissional</Label>
          <select id="rule-staff" name="staffId" required className={selectClassName}>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-day">Dia da semana</Label>
          <select id="rule-day" name="dayOfWeek" required className={selectClassName}>
            {WEEKDAYS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-start">Início</Label>
          <Input id="rule-start" type="time" name="startTime" required defaultValue="09:00" className="font-mono-data" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-end">Fim</Label>
          <Input id="rule-end" type="time" name="endTime" required defaultValue="18:00" className="font-mono-data" />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Adicionar horário recorrente"}
      </Button>
    </form>
  );
}

export function CreateExceptionForm({
  companySlug,
  staff,
}: {
  companySlug: string;
  staff: { id: string; displayName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) =>
      createAvailabilityExceptionAction(companySlug, formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exc-staff">Profissional</Label>
          <select id="exc-staff" name="staffId" required className={selectClassName}>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exc-type">Tipo</Label>
          <select id="exc-type" name="type" required className={selectClassName}>
            <option value="BLOCK">Bloqueio (folga, feriado...)</option>
            <option value="AVAILABLE">Disponibilidade extra</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exc-start">Início</Label>
          <Input id="exc-start" type="datetime-local" name="startsAt" required className="font-mono-data" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exc-end">Fim</Label>
          <Input id="exc-end" type="datetime-local" name="endsAt" required className="font-mono-data" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="exc-reason">Motivo (opcional)</Label>
        <Input id="exc-reason" type="text" name="reason" />
      </div>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Adicionar exceção"}
      </Button>
    </form>
  );
}
