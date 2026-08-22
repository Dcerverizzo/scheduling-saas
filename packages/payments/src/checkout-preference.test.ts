import { describe, expect, it } from "vitest";
import { buildBookingPreferencePayload, buildSubscriptionPreapprovalPayload } from "./checkout-preference";

describe("buildBookingPreferencePayload", () => {
  it("builds a preference payload with the amount converted to decimal reais", () => {
    const payload = buildBookingPreferencePayload({
      bookingId: "booking-1",
      title: "Corte — Barbearia do João",
      amountInCents: 4000,
      successUrl: "https://app.example.com/success",
      failureUrl: "https://app.example.com/failure",
      pendingUrl: "https://app.example.com/pending",
      notificationUrl: "https://app.example.com/webhook",
    });

    expect(payload.items).toEqual([
      { title: "Corte — Barbearia do João", quantity: 1, unit_price: 40, currency_id: "BRL" },
    ]);
    expect(payload.external_reference).toBe("booking-1");
    expect(payload.notification_url).toBe("https://app.example.com/webhook");
    expect(payload.back_urls).toEqual({
      success: "https://app.example.com/success",
      failure: "https://app.example.com/failure",
      pending: "https://app.example.com/pending",
    });
    expect(payload.auto_return).toBe("approved");
  });
});

describe("buildSubscriptionPreapprovalPayload", () => {
  it("builds a preapproval payload without card_token_id or an authorized status (redirect flow)", () => {
    const payload = buildSubscriptionPreapprovalPayload({
      companyId: "company-1",
      preapprovalPlanId: "plan-1",
      payerEmail: "owner@example.com",
      backUrl: "https://app.example.com/app/barbearia/plano",
    });

    expect(payload).toEqual({
      preapproval_plan_id: "plan-1",
      payer_email: "owner@example.com",
      back_url: "https://app.example.com/app/barbearia/plano",
      external_reference: "company-1",
    });
    expect(payload).not.toHaveProperty("card_token_id");
    expect(payload).not.toHaveProperty("status");
  });
});
