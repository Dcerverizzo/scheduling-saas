import { describe, expect, it } from "vitest";
import { overlaps, subtractInterval, subtractIntervals } from "./intervals";

function iv(startHour: number, endHour: number) {
  return { start: new Date(2026, 0, 1, startHour), end: new Date(2026, 0, 1, endHour) };
}

describe("overlaps", () => {
  it("detects overlapping intervals", () => {
    expect(overlaps(iv(9, 11), iv(10, 12))).toBe(true);
  });

  it("does not consider touching intervals as overlapping", () => {
    expect(overlaps(iv(9, 10), iv(10, 11))).toBe(false);
  });

  it("does not consider disjoint intervals as overlapping", () => {
    expect(overlaps(iv(9, 10), iv(11, 12))).toBe(false);
  });
});

describe("subtractInterval", () => {
  it("returns the base unchanged when there is no overlap", () => {
    expect(subtractInterval(iv(9, 10), iv(11, 12))).toEqual([iv(9, 10)]);
  });

  it("removes the base entirely when fully covered", () => {
    expect(subtractInterval(iv(9, 10), iv(8, 11))).toEqual([]);
  });

  it("splits the base in two when the cut is in the middle", () => {
    expect(subtractInterval(iv(9, 12), iv(10, 11))).toEqual([iv(9, 10), iv(11, 12)]);
  });

  it("trims from the start", () => {
    expect(subtractInterval(iv(9, 12), iv(8, 10))).toEqual([iv(10, 12)]);
  });

  it("trims from the end", () => {
    expect(subtractInterval(iv(9, 12), iv(11, 13))).toEqual([iv(9, 11)]);
  });
});

describe("subtractIntervals", () => {
  it("applies multiple cuts sequentially", () => {
    const result = subtractIntervals([iv(9, 17)], [iv(10, 11), iv(14, 15)]);
    expect(result).toEqual([iv(9, 10), iv(11, 14), iv(15, 17)]);
  });
});
