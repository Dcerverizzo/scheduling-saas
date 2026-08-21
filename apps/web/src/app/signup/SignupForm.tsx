"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { customerSignupAction } from "./actions";

const initialState = { error: null as string | null };

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(
    (_prevState: typeof initialState, formData: FormData) => customerSignupAction(formData),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>
      ) : null}
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="name">
          Nome
        </label>
        <input id="name" type="text" name="name" required className="field-underline" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="email">
          E-mail
        </label>
        <input id="email" type="email" name="email" required autoComplete="email" className="field-underline" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="phone">
          Telefone (WhatsApp)
        </label>
        <input
          id="phone"
          type="tel"
          name="phone"
          required
          placeholder="17999999999"
          className="field-underline font-mono-data"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground" htmlFor="password">
          Senha
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

      <Button type="submit" disabled={isPending} className="mt-1 h-11 text-[15px]">
        {isPending ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
