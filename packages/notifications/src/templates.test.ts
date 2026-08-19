import { describe, expect, it } from "vitest";
import {
  bookingCancelledMessage,
  bookingConfirmationMessage,
  bookingRescheduledMessage,
  bookingReminderMessage,
  type BookingMessageData,
} from "./templates";

const data: BookingMessageData = {
  companyName: "Barbearia do João",
  customerName: "Maria",
  serviceName: "Corte",
  staffName: "João",
  priceInCents: 4000,
  whenLocal: "24/08/2026 às 10:00",
};

describe("message templates", () => {
  it("confirmation includes company, service, staff, date and formatted price", () => {
    const message = bookingConfirmationMessage(data);
    expect(message).toContain("Barbearia do João");
    expect(message).toContain("Corte");
    expect(message).toContain("João");
    expect(message).toContain("24/08/2026 às 10:00");
    expect(message).toContain("R$ 40.00");
  });

  it("reminder mentions the service and when", () => {
    const message = bookingReminderMessage(data);
    expect(message).toContain("Lembrete");
    expect(message).toContain("Corte");
    expect(message).toContain("24/08/2026 às 10:00");
  });

  it("cancellation mentions the cancelled slot", () => {
    const message = bookingCancelledMessage(data);
    expect(message).toContain("cancelado");
    expect(message).toContain("24/08/2026 às 10:00");
  });

  it("reschedule mentions both old and new times", () => {
    const message = bookingRescheduledMessage({
      ...data,
      previousWhenLocal: "20/08/2026 às 09:00",
    });
    expect(message).toContain("20/08/2026 às 09:00");
    expect(message).toContain("24/08/2026 às 10:00");
  });
});
