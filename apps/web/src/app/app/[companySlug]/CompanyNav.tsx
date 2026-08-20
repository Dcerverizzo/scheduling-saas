import Link from "next/link";

const LINKS = [
  { href: "bookings", label: "Agenda" },
  { href: "settings", label: "Configurações" },
  { href: "staff", label: "Equipe" },
  { href: "services", label: "Serviços" },
  { href: "availability", label: "Disponibilidade" },
  { href: "google-calendar", label: "Google Calendar" },
] as const;

export function CompanyNav({ companySlug }: { companySlug: string }) {
  return (
    <nav className="flex gap-4 border-b border-gray-200 pb-3 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={`/app/${companySlug}/${link.href}`}
          className="underline-offset-2 hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
