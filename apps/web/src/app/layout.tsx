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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${schibstedGrotesk.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
