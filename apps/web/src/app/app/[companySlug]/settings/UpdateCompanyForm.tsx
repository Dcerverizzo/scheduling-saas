"use client";

import { useActionState } from "react";
import { updateCompanyAction } from "./actions";

type CompanyFields = {
  name: string;
  phone: string | null;
  timezone: string;
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
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          type="text"
          name="name"
          required
          defaultValue={company.name}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Telefone (WhatsApp)
        <input
          type="tel"
          name="phone"
          defaultValue={company.phone ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fuso horário (IANA)
        <input
          type="text"
          name="timezone"
          required
          defaultValue={company.timezone}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          type="text"
          name="addressLine1"
          defaultValue={company.addressLine1 ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Cidade
          <input
            type="text"
            name="city"
            defaultValue={company.city ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Estado
          <input
            type="text"
            name="state"
            defaultValue={company.state ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        CEP
        <input
          type="text"
          name="postalCode"
          defaultValue={company.postalCode ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
