import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@scheduling-saas/database";

const STATUS_COPY: Record<string, { title: string; message: string }> = {
  PENDING: {
    title: "Aguardando confirmação do pagamento",
    message:
      "Assim que o Mercado Pago confirmar, você recebe a confirmação do agendamento pelo WhatsApp. Isso pode levar alguns instantes — atualize esta página pra conferir.",
  },
  CONFIRMED: {
    title: "Agendamento confirmado",
    message: "Pagamento aprovado — a confirmação já foi enviada pelo WhatsApp.",
  },
  CANCELLED: {
    title: "Agendamento cancelado",
    message:
      "O pagamento não foi concluído a tempo (ou foi recusado) e o horário foi liberado. Volte à página da empresa pra tentar de novo.",
  },
};

// Nunca confirma nada por si só — só reflete o status atual do Booking. A confirmação de
// verdade acontece no worker, a partir do webhook do Mercado Pago (ver
// apps/whatsapp-worker/src/process-payment-webhook.ts). O back_url do Mercado Pago (sucesso,
// falha e pendente apontam todos pra cá) não é confiável como fonte de status — só como lugar
// de pouso.
export default async function BookingPaymentStatusPage({
  params,
  searchParams,
}: PageProps<"/[companySlug]/confirmar/pagamento">) {
  const { companySlug } = await params;
  const search = await searchParams;
  const bookingId = typeof search.bookingId === "string" ? search.bookingId : undefined;

  if (!bookingId) {
    notFound();
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
    include: { payment: true },
  });
  if (!booking) {
    notFound();
  }

  const copy = STATUS_COPY[booking.status] ?? STATUS_COPY.PENDING;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 pt-6 pb-12">
      <h1 className="text-lg font-bold">{copy.title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.message}</p>

      <div className="flex flex-col gap-3">
        <Link
          href={`/${companySlug}/confirmar/pagamento?bookingId=${booking.id}`}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold hover:border-primary/40"
        >
          Atualizar status
        </Link>
        <Link href={`/${companySlug}`} className="text-center text-sm text-muted-foreground hover:text-foreground">
          ← voltar pra {companySlug}
        </Link>
      </div>
    </main>
  );
}
