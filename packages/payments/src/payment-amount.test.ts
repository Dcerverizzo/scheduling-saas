import { describe, expect, it } from "vitest";
import {
  assertAuthoritativePaymentAmount,
  calculateDepositAmountInCents,
  centsToMercadoPagoAmount,
  PaymentAmountMismatchError,
} from "./payment-amount";

describe("calculateDepositAmountInCents", () => {
  it("calculates a percentage of the price, in cents", () => {
    expect(calculateDepositAmountInCents(10000, 30)).toBe(3000);
  });

  it("rounds down so the customer never pays more due to rounding", () => {
    expect(calculateDepositAmountInCents(9999, 33)).toBe(3299); // 3299.67 -> 3299
  });

  it("returns 0 for a 0% deposit", () => {
    expect(calculateDepositAmountInCents(10000, 0)).toBe(0);
  });
});

describe("assertAuthoritativePaymentAmount", () => {
  it("does not throw when amounts match", () => {
    expect(() => assertAuthoritativePaymentAmount(5000, 5000)).not.toThrow();
  });

  it("throws PaymentAmountMismatchError when amounts differ", () => {
    expect(() => assertAuthoritativePaymentAmount(5000, 4000)).toThrow(PaymentAmountMismatchError);
  });
});

describe("centsToMercadoPagoAmount", () => {
  it("converts cents to a decimal amount", () => {
    expect(centsToMercadoPagoAmount(1990)).toBe(19.9);
  });

  it("avoids floating point noise on values that don't divide cleanly", () => {
    expect(centsToMercadoPagoAmount(3299)).toBe(32.99);
    expect(centsToMercadoPagoAmount(1)).toBe(0.01);
  });

  it("handles whole reais", () => {
    expect(centsToMercadoPagoAmount(10000)).toBe(100);
  });
});
