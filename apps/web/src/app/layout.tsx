import type { Metadata } from "next";
import { Schibsted_Grotesk, Courier_Prime } from "next/font/google";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Agenda — agendamento online com confirmação no WhatsApp",
  description:
    "Plataforma de agendamento para barbearias, salões, clínicas e outros negócios de serviço no Brasil, com confirmação e lembretes automáticos via WhatsApp.",
};

// Aplica a classe "dark" antes da primeira pintura — sem isso a página sempre
// nasce clara e só escurece um instante depois via React, gerando flash. Roda
// como script clássico (não módulo) pra bloquear o parser antes do <body>.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (stored !== "light" && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${schibstedGrotesk.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
