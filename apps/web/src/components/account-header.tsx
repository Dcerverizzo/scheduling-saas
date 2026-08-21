import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/auth-actions";

export function AccountHeader() {
  return (
    <nav className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 sm:px-10">
      <Link href="/account/bookings" className="flex items-center gap-2.5">
        <span className="flex size-[22px] flex-col items-center justify-center gap-[3px] rounded-[5px] bg-foreground">
          <span className="h-px w-3 bg-card" />
          <span className="h-px w-3 bg-card" />
          <span className="h-px w-3 bg-card" />
        </span>
        <span className="font-mono-data text-sm font-bold tracking-tight">agenda.app</span>
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}
