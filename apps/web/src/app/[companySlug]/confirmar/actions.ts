"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@scheduling-saas/database";
import { DomainError, normalizePhoneToE164 } from "@scheduling-saas/domain";
import { guestBookingSchema } from "@scheduling-saas/validation";
import { auth } from "@/auth";
import { createBooking } from "@/lib/booking/create-booking";
import { resolveGuestCustomer } from "@/lib/booking/resolve-guest-customer";
import {
  enqueueBookingConfirmation,
  scheduleBookingReminders,
} from "@/lib/notifications/enqueue-booking-notifications";
import { enqueueGoogleCalendarSync } from "@/lib/google-calendar/enqueue-booking-sync";
import { checkRateLimit } from "@/lib/rate-limit";
import { createBookingPayment } from "@/lib/payments/create-booking-payment";

export async function confirmBookingAction(
  companySlug: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const allowed = await checkRateLimit({
    key: `create-booking:${session.user.id}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) {
    return { error: "Muitas tentativas. Tente novamente em instantes." };
  }

  const serviceId = String(formData.get("serviceId") ?? "");
  const staffId = String(formData.get("staffId") ?? "");
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const startsAt = new Date(startsAtRaw);

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id } });
  if (!customer) {
    return { error: "Sua conta não está configurada como cliente." };
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    return { error: "Empresa não encontrada." };
  }

  try {
    const booking = await createBooking({
      companyId: company.id,
      customerId: customer.id,
      staffId,
      serviceId,
      startsAt,
      idempotencyKey: idempotencyKey || undefined,
      actorUserId: session.user.id,
    });

    if (booking.status === "PENDING") {
      // Empresa exige pagamento — nada de confirmação/lembrete/sync do Calendar ainda (o
      // booking pode expirar sem pagar). O worker dispara tudo isso quando o webhook do
      // Mercado Pago confirmar (ver process-payment-webhook.ts).
      const { initPoint } = await createBookingPayment(booking, company);
      redirect(initPoint);
    }

    // Fora da transação de criação do booking (item 21 do PRD).
    await enqueueBookingConfirmation(booking.id);
    await scheduleBookingReminders(booking.id);
    await enqueueGoogleCalendarSync(booking.id);

    redirect(`/account/bookings?confirmed=${booking.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

// Agendamento sem conta (Fase 2, item 12 do roadmap do PRD) — cria/reaproveita
// um CustomerProfile "convidado" (resolveGuestCustomer) em vez de exigir
// sessão. Sem session.user.id pra chave de rate limit (não existe aqui) —
// limita por IP e por telefone normalizado, mesma infra de signup/availability.
export async function confirmGuestBookingAction(
  companySlug: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const serviceId = String(formData.get("serviceId") ?? "");
  const staffId = String(formData.get("staffId") ?? "");
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const startsAt = new Date(startsAtRaw);

  const parsed = guestBookingSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const normalizedPhone = normalizePhoneToE164(parsed.data.phone);
  if (!normalizedPhone) {
    return { error: "Telefone inválido." };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const ipAllowed = await checkRateLimit({
    key: `guest-booking-ip:${ip}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!ipAllowed) {
    return { error: "Muitas tentativas. Tente novamente em instantes." };
  }

  const phoneAllowed = await checkRateLimit({
    key: `guest-booking-phone:${normalizedPhone}`,
    limit: 5,
    windowSeconds: 300,
  });
  if (!phoneAllowed) {
    return { error: "Muitas tentativas com esse telefone. Tente novamente em alguns minutos." };
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    return { error: "Empresa não encontrada." };
  }

  try {
    const customer = await resolveGuestCustomer({ name: parsed.data.name, phone: normalizedPhone });

    const booking = await createBooking({
      companyId: company.id,
      customerId: customer.id,
      staffId,
      serviceId,
      startsAt,
      idempotencyKey: idempotencyKey || undefined,
      actorUserId: customer.userId,
    });

    if (booking.status === "PENDING") {
      const { initPoint } = await createBookingPayment(booking, company);
      redirect(initPoint);
    }

    // Fora da transação de criação do booking (item 21 do PRD).
    await enqueueBookingConfirmation(booking.id);
    await scheduleBookingReminders(booking.id);
    await enqueueGoogleCalendarSync(booking.id);

    // Sem sessão pra mandar pro /account/bookings — volta pra página pública
    // da empresa com um banner de sucesso (guest não tem "meus agendamentos").
    redirect(`/${companySlug}?confirmed=1`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}
