import { describe, expect, it } from "vitest";
import { buildAvailabilityExceptionDiff } from "./availability-sync-diff";
import type { GoogleCalendarEventSummary } from "./google-calendar-events";

function event(overrides: Partial<GoogleCalendarEventSummary>): GoogleCalendarEventSummary {
  return {
    id: "evt-1",
    status: "confirmed",
    startsAt: new Date("2026-08-24T12:00:00.000Z"),
    endsAt: new Date("2026-08-24T13:00:00.000Z"),
    isAppManaged: false,
    ...overrides,
  };
}

describe("buildAvailabilityExceptionDiff", () => {
  it("creates a new exception for a new blocking event", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1" })],
      existingExceptions: [],
    });

    expect(diff.toCreate).toEqual([
      {
        externalEventId: "evt-1",
        startsAt: new Date("2026-08-24T12:00:00.000Z"),
        endsAt: new Date("2026-08-24T13:00:00.000Z"),
      },
    ]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toDeleteExternalEventIds).toEqual([]);
  });

  it("updates an existing exception when the time changed", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [
        event({ id: "evt-1", startsAt: new Date("2026-08-24T14:00:00.000Z"), endsAt: new Date("2026-08-24T15:00:00.000Z") }),
      ],
      existingExceptions: [
        {
          externalEventId: "evt-1",
          startsAt: new Date("2026-08-24T12:00:00.000Z"),
          endsAt: new Date("2026-08-24T13:00:00.000Z"),
        },
      ],
    });

    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([
      {
        externalEventId: "evt-1",
        startsAt: new Date("2026-08-24T14:00:00.000Z"),
        endsAt: new Date("2026-08-24T15:00:00.000Z"),
      },
    ]);
  });

  it("does nothing when an existing exception's time is unchanged", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1" })],
      existingExceptions: [
        {
          externalEventId: "evt-1",
          startsAt: new Date("2026-08-24T12:00:00.000Z"),
          endsAt: new Date("2026-08-24T13:00:00.000Z"),
        },
      ],
    });

    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toDeleteExternalEventIds).toEqual([]);
  });

  it("deletes an exception when the Google event was cancelled", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1", status: "cancelled", startsAt: null, endsAt: null })],
      existingExceptions: [
        {
          externalEventId: "evt-1",
          startsAt: new Date("2026-08-24T12:00:00.000Z"),
          endsAt: new Date("2026-08-24T13:00:00.000Z"),
        },
      ],
    });

    expect(diff.toDeleteExternalEventIds).toEqual(["evt-1"]);
    expect(diff.toCreate).toEqual([]);
  });

  it("ignores a cancelled event that was never tracked (nothing to delete)", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1", status: "cancelled", startsAt: null, endsAt: null })],
      existingExceptions: [],
    });

    expect(diff).toEqual({ toCreate: [], toUpdate: [], toDeleteExternalEventIds: [] });
  });

  it("never creates a block for an event the app itself manages (has a bookingId)", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1", isAppManaged: true })],
      existingExceptions: [],
    });

    expect(diff.toCreate).toEqual([]);
  });

  it("deletes a tracked exception if it somehow becomes app-managed", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1", isAppManaged: true })],
      existingExceptions: [
        {
          externalEventId: "evt-1",
          startsAt: new Date("2026-08-24T12:00:00.000Z"),
          endsAt: new Date("2026-08-24T13:00:00.000Z"),
        },
      ],
    });

    expect(diff.toDeleteExternalEventIds).toEqual(["evt-1"]);
  });

  it("skips all-day events (no startsAt/endsAt)", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [event({ id: "evt-1", startsAt: null, endsAt: null })],
      existingExceptions: [],
    });

    expect(diff).toEqual({ toCreate: [], toUpdate: [], toDeleteExternalEventIds: [] });
  });

  it("handles a batch of mixed events independently", () => {
    const diff = buildAvailabilityExceptionDiff({
      googleEvents: [
        event({ id: "new-block" }),
        event({ id: "cancelled-tracked", status: "cancelled", startsAt: null, endsAt: null }),
        event({ id: "own-booking", isAppManaged: true }),
        event({ id: "all-day", startsAt: null, endsAt: null }),
      ],
      existingExceptions: [
        {
          externalEventId: "cancelled-tracked",
          startsAt: new Date("2026-08-24T12:00:00.000Z"),
          endsAt: new Date("2026-08-24T13:00:00.000Z"),
        },
      ],
    });

    expect(diff.toCreate).toEqual([
      {
        externalEventId: "new-block",
        startsAt: new Date("2026-08-24T12:00:00.000Z"),
        endsAt: new Date("2026-08-24T13:00:00.000Z"),
      },
    ]);
    expect(diff.toDeleteExternalEventIds).toEqual(["cancelled-tracked"]);
    expect(diff.toUpdate).toEqual([]);
  });
});
