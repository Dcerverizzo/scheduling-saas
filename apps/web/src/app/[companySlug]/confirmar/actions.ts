"use server";

import { redirect } from "next/navigation";
import { prisma } from "@scheduling-saas/database";
import { DomainError } from "@scheduling-saas/domain";
import { auth } from "@/auth";
import { createBooking } from "@/lib/booking/create-booking";
import {
  enqueueBookingConfirmation,
  scheduleBookingReminders,
} from "@/lib/notifications/enqueue-booking-notifications";
import { checkRateLimit } from "@/lib/rate-limit";

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

    // Fora da transação de criação do booking (item 21 do PRD).
    await enqueueBookingConfirmation(booking.id);
    await scheduleBookingReminders(booking.id);

    redirect(`/account/bookings?confirmed=${booking.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}
