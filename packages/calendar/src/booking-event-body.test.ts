import { describe, expect, it } from "vitest";
import { buildBookingEventBody } from "./booking-event-body";

describe("buildBookingEventBody", () => {
  it("builds summary, timed start/end, and the bookingId marker", () => {
    const body = buildBookingEventBody({
      bookingId: "booking-1",
      companyId: "company-1",
      companyName: "Barbearia do João",
      serviceName: "Corte",
      customerName: "Maria",
      customerPhone: "+5517999999999",
      startsAt: new Date("2026-08-24T12:00:00.000Z"),
      endsAt: new Date("2026-08-24T13:00:00.000Z"),
      timezone: "America/Sao_Paulo",
    });

    expect(body.summary).toBe("Corte — Maria");
    expect(body.description).toContain("Barbearia do João");
    expect(body.description).toContain("+5517999999999");
    expect(body.start).toEqual({
      dateTime: "2026-08-24T12:00:00.000Z",
      timeZone: "America/Sao_Paulo",
    });
    expect(body.end).toEqual({
      dateTime: "2026-08-24T13:00:00.000Z",
      timeZone: "America/Sao_Paulo",
    });
    expect(body.extendedProperties.private).toEqual({
      bookingId: "booking-1",
      companyId: "company-1",
    });
  });

  it("omits the phone line when the booking has no phone snapshot", () => {
    const body = buildBookingEventBody({
      bookingId: "booking-1",
      companyId: "company-1",
      companyName: "Barbearia do João",
      serviceName: "Corte",
      customerName: "Maria",
      customerPhone: null,
      startsAt: new Date("2026-08-24T12:00:00.000Z"),
      endsAt: new Date("2026-08-24T13:00:00.000Z"),
      timezone: "America/Sao_Paulo",
    });

    expect(body.description).toBe("Empresa: Barbearia do João");
  });
});
