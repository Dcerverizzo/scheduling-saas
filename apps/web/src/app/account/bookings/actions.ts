"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@scheduling-saas/database";
import { cancelBooking } from "@/lib/booking/cancel-booking";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function cancelMyBookingAction(bookingId: string) {
  const session = await auth();
  if (!session?.user) return;

  const allowed = await checkRateLimit({
    key: `cancel-booking:${session.user.id}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) return;

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id } });
  if (!customer) return;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: customer.id },
  });
  if (!booking) return;

  await cancelBooking({
    bookingId: booking.id,
    companyId: booking.companyId,
    actorUserId: session.user.id,
  });

  revalidatePath("/account/bookings");
}
