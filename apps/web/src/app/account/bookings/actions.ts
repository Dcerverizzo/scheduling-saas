"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@scheduling-saas/database";
import { DomainError } from "@scheduling-saas/domain";
import { cancelBooking } from "@/lib/booking/cancel-booking";
import { rescheduleBooking } from "@/lib/booking/reschedule-booking";
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

export async function rescheduleMyBookingAction(bookingId: string, date: string, startsAtIso: string) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const reschedulePath = `/account/bookings/${bookingId}/reschedule`;

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id } });
  if (!customer) return;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: customer.id },
  });
  if (!booking) return;

  const allowed = await checkRateLimit({
    key: `reschedule-booking:${session.user.id}`,
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
      companyId: booking.companyId,
      newStartsAt: new Date(startsAtIso),
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`${reschedulePath}?date=${date}&error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/account/bookings");
  redirect("/account/bookings");
}
