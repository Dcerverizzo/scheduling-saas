"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@scheduling-saas/database";
import { requireCompanyContext } from "@/lib/company-context";
import { cancelBooking } from "@/lib/booking/cancel-booking";

export async function cancelCompanyBookingAction(companySlug: string, bookingId: string) {
  const { userId, company, membership } = await requireCompanyContext(companySlug);

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
