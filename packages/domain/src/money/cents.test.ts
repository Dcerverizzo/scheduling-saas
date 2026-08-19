import { describe, expect, it } from "vitest";
import { formatCentsAsDecimalString, parseCentsFromDecimalString } from "./cents";

describe("parseCentsFromDecimalString", () => {
  it("parses whole numbers", () => {
    expect(parseCentsFromDecimalString("49")).toBe(4900);
  });

  it("parses decimals with a dot", () => {
    expect(parseCentsFromDecimalString("49.90")).toBe(4990);
  });

  it("parses decimals with a comma (formato BR)", () => {
    expect(parseCentsFromDecimalString("49,90")).toBe(4990);
  });

  it("pads a single decimal digit", () => {
    expect(parseCentsFromDecimalString("49.9")).toBe(4990);
  });

  it("rejects invalid input", () => {
    expect(parseCentsFromDecimalString("abc")).toBeNull();
    expect(parseCentsFromDecimalString("49.999")).toBeNull();
    expect(parseCentsFromDecimalString("-10")).toBeNull();
  });
});

describe("formatCentsAsDecimalString", () => {
  it("formats cents back to a decimal string", () => {
    expect(formatCentsAsDecimalString(4990)).toBe("49.90");
    expect(formatCentsAsDecimalString(100)).toBe("1.00");
    expect(formatCentsAsDecimalString(5)).toBe("0.05");
  });
});
