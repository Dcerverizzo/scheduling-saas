import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-6 pb-10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-5 flex-col items-center justify-center gap-[3px] rounded-[5px] bg-foreground">
            <span className="h-px w-3 bg-background" />
            <span className="h-px w-3 bg-background" />
            <span className="h-px w-3 bg-background" />
          </span>
          <span className="font-mono-data text-[13px] font-bold">agenda.app</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-9">
        <span className="font-mono-data text-[11px] font-bold tracking-wide text-primary">
          PARA BARBEARIAS, SALÕES E CLÍNICAS
        </span>
        <h1 className="mt-3.5 text-[33px] font-bold leading-[1.12] text-balance">
          Agenda que confirma sozinha.
        </h1>
        <p className="mt-4 max-w-[33ch] text-[15.5px] leading-relaxed text-muted-foreground">
          O cliente escolhe o horário. O WhatsApp confirma e lembra. Você só precisa aparecer pra
          atender.
        </p>
      </div>

      <div className="mt-7">
        <div className="-rotate-1 overflow-hidden rounded-sm bg-card shadow-[0_14px_30px_-18px_rgba(35,36,31,0.35)]">
          <div className="flex items-start justify-between gap-3 px-5 pt-4.5 pb-4">
            <div>
              <p className="font-mono-data text-[10px] tracking-wide text-muted-foreground">Nº 0417</p>
              <p className="mt-1 text-base font-bold">Corte — Maria O.</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">com João · Barbearia do João</p>
            </div>
            <span className="rotate-3 rounded bg-success-soft px-2 py-1 text-[10px] font-bold tracking-wide whitespace-nowrap text-success">
              CONFIRMADO
            </span>
          </div>
          <div className="ticket-perforation" />
          <div className="font-mono-data flex justify-between px-5 pt-3.5 pb-4.5 text-[13px] text-muted-foreground">
            <span>QUA 26/08</span>
            <span className="font-bold text-foreground">14:00</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <Link href="/signup" className={buttonVariants({ className: "h-[52px] text-[15px]" })}>
          Criar minha agenda grátis
        </Link>
        <Link href="/login" className="py-1.5 text-center text-[13.5px] text-muted-foreground">
          Já tenho conta — <span className="font-medium text-primary">Entrar</span>
        </Link>
      </div>

      <div className="mt-10 flex-1 border-t border-border pt-7">
        <span className="font-mono-data text-[11px] font-bold tracking-wide text-muted-foreground">
          COMO FUNCIONA
        </span>
        <ol className="mt-4 flex flex-col gap-5">
          <li className="flex gap-3.5">
            <span className="font-mono-data w-4 flex-none text-[13px] font-bold text-primary">1</span>
            <p className="text-[14.5px] leading-relaxed">
              Cliente agenda pelo link da sua empresa, sem baixar app nem criar conta até o fim.
            </p>
          </li>
          <li className="flex gap-3.5">
            <span className="font-mono-data w-4 flex-none text-[13px] font-bold text-primary">2</span>
            <p className="text-[14.5px] leading-relaxed">
              Confirmação e lembrete chegam sozinhos no WhatsApp — do cliente e da sua agenda.
            </p>
          </li>
          <li className="flex gap-3.5">
            <span className="font-mono-data w-4 flex-none text-[13px] font-bold text-primary">3</span>
            <p className="text-[14.5px] leading-relaxed">
              Dois clientes nunca caem no mesmo horário — o sistema garante, não a sorte.
            </p>
          </li>
        </ol>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">Feito para pequenos negócios de serviço no Brasil.</p>
      </div>
    </main>
  );
}
