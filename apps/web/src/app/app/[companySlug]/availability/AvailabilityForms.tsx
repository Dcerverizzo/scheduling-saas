"use client";

import { useActionState } from "react";
import { createAvailabilityExceptionAction, createAvailabilityRuleAction } from "./actions";

const initialState = { error: null as string | null };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Profissional
          <select name="staffId" required className="rounded-md border border-gray-300 px-3 py-2">
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dia da semana
          <select name="dayOfWeek" required className="rounded-md border border-gray-300 px-3 py-2">
            {WEEKDAYS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Início
          <input
            type="time"
            name="startTime"
            required
            defaultValue="09:00"
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fim
          <input
            type="time"
            name="endTime"
            required
            defaultValue="18:00"
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Adicionar horário recorrente"}
      </button>
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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Profissional
          <select name="staffId" required className="rounded-md border border-gray-300 px-3 py-2">
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select name="type" required className="rounded-md border border-gray-300 px-3 py-2">
            <option value="BLOCK">Bloqueio (folga, feriado...)</option>
            <option value="AVAILABLE">Disponibilidade extra</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Início
          <input
            type="datetime-local"
            name="startsAt"
            required
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fim
          <input
            type="datetime-local"
            name="endsAt"
            required
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Motivo (opcional)
        <input type="text" name="reason" className="rounded-md border border-gray-300 px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Adicionar exceção"}
      </button>
    </form>
  );
}
