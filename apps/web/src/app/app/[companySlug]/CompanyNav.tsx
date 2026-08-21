"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/auth-actions";

const LINKS = [
  { href: "bookings", label: "Agenda" },
  { href: "settings", label: "Configurações" },
  { href: "staff", label: "Equipe" },
  { href: "services", label: "Serviços" },
  { href: "availability", label: "Disponibilidade" },
  { href: "google-calendar", label: "Google Calendar" },
] as const;

export function CompanyNav({ companySlug, companyName }: { companySlug: string; companyName: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 sm:px-10">
      <div className="flex items-center gap-6">
        <Link
          href="/app"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Minhas empresas</span>
        </Link>
        <span className="h-5 w-px bg-border" />
        <span className="font-mono-data text-sm font-bold tracking-tight">{companyName}</span>
        <div className="hidden items-center gap-7 sm:flex">
          {LINKS.map((link) => {
            const href = `/app/${companySlug}/${link.href}`;
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={link.href}
                href={href}
                className={cn(
                  "border-b-2 border-transparent py-[22px] text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "border-primary text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

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
