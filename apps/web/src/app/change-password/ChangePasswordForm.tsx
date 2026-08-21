"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "./actions";

const initialState = { error: null as string | null };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) => changePasswordAction(formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="password">
          Nova senha
        </label>
        <input
          id="password"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-underline"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
          htmlFor="confirmPassword"
        >
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-underline"
        />
      </div>
      <Button type="submit" disabled={isPending} className="mt-1 h-11 text-[15px]">
        {isPending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
