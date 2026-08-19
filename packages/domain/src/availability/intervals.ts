export interface Interval {
  start: Date;
  end: Date;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function subtractInterval(base: Interval, cut: Interval): Interval[] {
  if (!overlaps(base, cut)) {
    return [base];
  }

  const result: Interval[] = [];
  if (cut.start > base.start) {
    result.push({ start: base.start, end: cut.start < base.end ? cut.start : base.end });
  }
  if (cut.end < base.end) {
    result.push({ start: cut.end > base.start ? cut.end : base.start, end: base.end });
  }
  return result;
}

export function subtractIntervals(bases: Interval[], cuts: Interval[]): Interval[] {
  return cuts.reduce(
    (acc, cut) => acc.flatMap((base) => subtractInterval(base, cut)),
    bases,
  );
}
