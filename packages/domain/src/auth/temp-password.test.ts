import { describe, expect, it } from "vitest";
import { generateTempPassword } from "./temp-password";

describe("generateTempPassword", () => {
  it("generates a password of the requested length", () => {
    expect(generateTempPassword(12)).toHaveLength(12);
    expect(generateTempPassword(8)).toHaveLength(8);
  });

  it("never includes visually ambiguous characters", () => {
    const password = generateTempPassword(500);
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it("generates different passwords on each call", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).not.toBe(b);
  });
});
