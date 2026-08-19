import { describe, expect, it } from "vitest";
import { assertValidBookingTransition, canTransitionBookingStatus } from "./status";

describe("canTransitionBookingStatus", () => {
  it("allows PENDING -> CONFIRMED", () => {
    expect(canTransitionBookingStatus("PENDING", "CONFIRMED")).toBe(true);
  });

  it("allows CONFIRMED -> CANCELLED", () => {
    expect(canTransitionBookingStatus("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("allows CONFIRMED -> COMPLETED and CONFIRMED -> NO_SHOW", () => {
    expect(canTransitionBookingStatus("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransitionBookingStatus("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  it("rejects CANCELLED -> COMPLETED (exemplo explícito do PRD)", () => {
    expect(canTransitionBookingStatus("CANCELLED", "COMPLETED")).toBe(false);
  });

  it("rejects any transition out of terminal states", () => {
    for (const terminal of ["CANCELLED", "COMPLETED", "NO_SHOW"] as const) {
      for (const target of ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const) {
        if (terminal === target) continue;
        expect(canTransitionBookingStatus(terminal, target)).toBe(false);
      }
    }
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransitionBookingStatus("CONFIRMED", "CONFIRMED")).toBe(false);
  });
});

describe("assertValidBookingTransition", () => {
  it("does not throw for a valid transition", () => {
    expect(() => assertValidBookingTransition("PENDING", "CANCELLED")).not.toThrow();
  });

  it("throws for an invalid transition", () => {
    expect(() => assertValidBookingTransition("CANCELLED", "COMPLETED")).toThrow(
      /Transição de status inválida/,
    );
  });
});
