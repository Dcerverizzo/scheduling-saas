"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@scheduling-saas/database";
import { DomainError } from "@scheduling-saas/domain";
import { requireCompanyContext } from "@/lib/company-context";
import { cancelBooking } from "@/lib/booking/cancel-booking";
import { rescheduleBooking } from "@/lib/booking/reschedule-booking";
import { checkRateLimit } from "@/lib/rate-limit";

export async function cancelCompanyBookingAction(companySlug: string, bookingId: string) {
  const { userId, company, membership } = await requireCompanyContext(companySlug);

  const allowed = await checkRateLimit({
    key: `cancel-booking:${userId}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) return;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, companyId: company.id },
  });
  if (!booking) return;

  if (membership.role === "STAFF") {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { companyId_userId: { companyId: company.id, userId } },
    });
    if (!staffProfile || booking.staffId !== staffProfile.id) {
      return;
    }
  }

  await cancelBooking({ bookingId: booking.id, companyId: company.id, actorUserId: userId });

  revalidatePath(`/app/${companySlug}/bookings`);
}

export async function rescheduleCompanyBookingAction(
  companySlug: string,
  bookingId: string,
  date: string,
  startsAtIso: string,
) {
  const { userId, company, membership } = await requireCompanyContext(companySlug);

  const reschedulePath = `/app/${companySlug}/bookings/${bookingId}/reschedule`;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, companyId: company.id },
  });
  if (!booking) return;

  if (membership.role === "STAFF") {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { companyId_userId: { companyId: company.id, userId } },
    });
    if (!staffProfile || booking.staffId !== staffProfile.id) {
      return;
    }
  }

  const allowed = await checkRateLimit({
    key: `reschedule-booking:${userId}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) {
    redirect(
      `${reschedulePath}?date=${date}&error=${encodeURIComponent("Muitas tentativas. Tente novamente em instantes.")}`,
    );
  }

  try {
    await rescheduleBooking({
      bookingId: booking.id,
      companyId: company.id,
      newStartsAt: new Date(startsAtIso),
      actorUserId: userId,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`${reschedulePath}?date=${date}&error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(`/app/${companySlug}/bookings`);
  redirect(`/app/${companySlug}/bookings`);
}
