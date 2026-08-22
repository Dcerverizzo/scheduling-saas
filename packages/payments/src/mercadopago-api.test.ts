import { afterEach, describe, expect, it, vi } from "vitest";
import type { MercadoPagoPreferenceRequestBody } from "./checkout-preference";
import {
  buildSubscriptionCheckoutUrl,
  createPreapproval,
  createPreapprovalPlan,
  createPreference,
  getPayment,
  getPreapproval,
  MercadoPagoApiError,
} from "./mercadopago-api";

const AUTH = { accessToken: "test-token" };

const SAMPLE_PREFERENCE_BODY: MercadoPagoPreferenceRequestBody = {
  items: [{ title: "Corte", quantity: 1, unit_price: 40, currency_id: "BRL" }],
  back_urls: { success: "s", failure: "f", pending: "p" },
  notification_url: "https://app.example.com/webhook",
  external_reference: "booking-1",
  auto_return: "approved",
};

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createPreference", () => {
  it("posts to /checkout/preferences with a bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "pref-1", init_point: "https://mp/checkout" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createPreference(AUTH, SAMPLE_PREFERENCE_BODY);

    expect(result).toEqual({ id: "pref-1", init_point: "https://mp/checkout" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/checkout/preferences");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init.body as string)).toEqual(SAMPLE_PREFERENCE_BODY);
  });

  it("throws MercadoPagoApiError with the response body on a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "invalid access token" }, { ok: false, status: 401 })),
    );

    await expect(createPreference(AUTH, SAMPLE_PREFERENCE_BODY)).rejects.toThrow(MercadoPagoApiError);
    await expect(createPreference(AUTH, SAMPLE_PREFERENCE_BODY)).rejects.toThrow(/401/);
  });
});

describe("getPayment", () => {
  it("gets the payment by id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 123, status: "approved", status_detail: "accredited", transaction_amount: 40, external_reference: "booking-1", payment_method_id: "pix" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const payment = await getPayment(AUTH, "123");

    expect(payment.status).toBe("approved");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.mercadopago.com/v1/payments/123");
  });
});

describe("createPreapprovalPlan / createPreapproval / getPreapproval", () => {
  it("posts to /preapproval_plan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "plan-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createPreapprovalPlan(AUTH, {
      reason: "Plano STARTER",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 49.9, currency_id: "BRL" },
    });

    expect(result).toEqual({ id: "plan-1" });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.mercadopago.com/preapproval_plan");
  });

  it("posts to /preapproval without card_token_id, matching the redirect subscription flow", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "preapproval-1", status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);

    await createPreapproval(AUTH, {
      preapproval_plan_id: "plan-1",
      payer_email: "owner@example.com",
      back_url: "https://app.example.com/plano",
      external_reference: "company-1",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/preapproval");
    expect(JSON.parse(init.body as string)).not.toHaveProperty("card_token_id");
  });

  it("gets a preapproval by id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ id: "preapproval-1", status: "authorized", external_reference: "company-1" })),
    );

    const preapproval = await getPreapproval(AUTH, "preapproval-1");
    expect(preapproval.status).toBe("authorized");
  });
});

describe("buildSubscriptionCheckoutUrl", () => {
  it("builds the documented checkout URL format with the preapproval id", () => {
    expect(buildSubscriptionCheckoutUrl("abc-123")).toBe(
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=abc-123",
    );
  });

  it("URL-encodes the preapproval id", () => {
    expect(buildSubscriptionCheckoutUrl("id with space")).toBe(
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=id%20with%20space",
    );
  });
});
