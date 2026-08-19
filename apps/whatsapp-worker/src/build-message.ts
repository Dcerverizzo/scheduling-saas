import {
  bookingCancelledMessage,
  bookingConfirmationMessage,
  bookingReminderMessage,
  bookingRescheduledMessage,
  type BookingMessageData,
} from "@scheduling-saas/notifications";
import type { Booking, Company, StaffProfile } from "@scheduling-saas/database";
import type { NotificationType } from "@scheduling-saas/database";

export function buildBookingMessageData(
  booking: Booking,
  company: Company,
  staff: StaffProfile,
): BookingMessageData {
  return {
    companyName: company.name,
    customerName: booking.customerNameSnapshot,
    serviceName: booking.serviceNameSnapshot,
    staffName: staff.displayName,
    priceInCents: booking.servicePriceSnapshot,
    whenLocal: booking.startsAt.toLocaleString("pt-BR", { timeZone: company.timezone }),
  };
}

export function buildMessage(
  type: NotificationType,
  data: BookingMessageData,
  extra?: { previousWhenLocal?: string },
): string {
  switch (type) {
    case "BOOKING_CONFIRMATION":
      return bookingConfirmationMessage(data);
    case "BOOKING_REMINDER":
      return bookingReminderMessage(data);
    case "BOOKING_CANCELLED":
      return bookingCancelledMessage(data);
    case "BOOKING_RESCHEDULED":
      return bookingRescheduledMessage({
        ...data,
        previousWhenLocal: extra?.previousWhenLocal ?? data.whenLocal,
      });
  }
}
