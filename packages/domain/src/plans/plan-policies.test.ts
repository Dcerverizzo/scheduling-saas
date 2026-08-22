import { describe, expect, it } from "vitest";
import { isSubscriptionBlocked, isWithinPlanLimit, planIncludesFeature } from "./plan-policies";

describe("planIncludesFeature", () => {
  it("returns false for a feature not listed in the plan's config", () => {
    expect(planIncludesFeature("FREE", "GOOGLE_CALENDAR_SYNC")).toBe(false);
  });
});

describe("isWithinPlanLimit", () => {
  it("allows counts below the limit", () => {
    expect(isWithinPlanLimit("FREE", "staff", 0)).toBe(true);
  });

  it("rejects counts at or above the limit", () => {
    expect(isWithinPlanLimit("FREE", "staff", 1)).toBe(false);
    expect(isWithinPlanLimit("FREE", "staff", 2)).toBe(false);
  });

  it("treats a null limit as unlimited", () => {
    expect(isWithinPlanLimit("PRO", "staff", 999)).toBe(true);
    expect(isWithinPlanLimit("PRO", "bookingsPerMonth", 999)).toBe(true);
  });
});

describe("isSubscriptionBlocked", () => {
  const now = new Date("2026-08-22T12:00:00Z");

  it("never blocks ACTIVE", () => {
    expect(isSubscriptionBlocked("ACTIVE", null, now)).toBe(false);
  });

  it("does not block TRIALING before trialEndsAt", () => {
    const trialEndsAt = new Date("2026-08-23T00:00:00Z");
    expect(isSubscriptionBlocked("TRIALING", trialEndsAt, now)).toBe(false);
  });

  it("blocks TRIALING after trialEndsAt", () => {
    const trialEndsAt = new Date("2026-08-21T00:00:00Z");
    expect(isSubscriptionBlocked("TRIALING", trialEndsAt, now)).toBe(true);
  });

  it("blocks TRIALING with no trialEndsAt set (defensive default)", () => {
    expect(isSubscriptionBlocked("TRIALING", null, now)).toBe(true);
  });

  it("blocks PAST_DUE, CANCELED, and INCOMPLETE", () => {
    expect(isSubscriptionBlocked("PAST_DUE", null, now)).toBe(true);
    expect(isSubscriptionBlocked("CANCELED", null, now)).toBe(true);
    expect(isSubscriptionBlocked("INCOMPLETE", null, now)).toBe(true);
  });
});
