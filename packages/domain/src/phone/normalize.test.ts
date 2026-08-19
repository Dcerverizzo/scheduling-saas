import { describe, expect, it } from "vitest";
import { normalizePhoneToE164 } from "./normalize";

describe("normalizePhoneToE164", () => {
  it("adds the default country code to a BR mobile number", () => {
    expect(normalizePhoneToE164("17999999999")).toBe("+5517999999999");
  });

  it("strips formatting characters before normalizing", () => {
    expect(normalizePhoneToE164("(17) 99999-9999")).toBe("+5517999999999");
  });

  it("keeps an already-international number as-is", () => {
    expect(normalizePhoneToE164("+1 415 555 2671")).toBe("+14155552671");
  });

  it("returns null for empty or too-short input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164("123")).toBeNull();
  });
});
