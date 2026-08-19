import { describe, expect, it } from "vitest";
import {
  getAvailableSlots,
  type AvailabilityExceptionInput,
  type AvailabilityRuleInput,
} from "./get-available-slots";

// 2026-01-05 é uma segunda-feira -> dayOfWeek 1 (0=domingo..6=sábado), usado nos
// casos 1-8. America/Sao_Paulo é UTC-3 fixo (Brasil não observa DST desde 2019),
// o que torna os asserts diretos de ler; DST de verdade é testado à parte (caso 11).
const MONDAY = "2026-01-05";
const TZ = "America/Sao_Paulo";
// "now" fixo, sempre antes das datas testadas — evita que os testes fiquem no
// passado (e portanto vazios por causa do minimumBookingNoticeMinutes/maximumBookingAdvanceDays
// default) conforme o tempo passa.
const NOW = new Date("2026-01-01T00:00:00Z");

function rule(overrides: Partial<AvailabilityRuleInput> = {}): AvailabilityRuleInput {
  return {
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "12:00",
    active: true,
    ...overrides,
  };
}

function toLocalTimes(slots: Date[]): string[] {
  return slots.map((slot) =>
    slot.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),
  );
}

function utc(iso: string): Date {
  return new Date(iso);
}

describe("getAvailableSlots", () => {
  it("caso 1: janela 09:00-12:00, serviço de 60min gera slots a cada 15min até caber", () => {
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 60,
      now: NOW,
      rules: [rule()],
    });

    expect(toLocalTimes(slots)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
      "10:00",
      "10:15",
      "10:30",
      "10:45",
      "11:00",
    ]);
  });

  it("caso 2: booking existente 10:00-11:00 remove o slot das 10:00", () => {
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 60,
      now: NOW,
      rules: [rule()],
      existingBookings: [
        { startsAt: utc("2026-01-05T13:00:00Z"), endsAt: utc("2026-01-05T14:00:00Z") },
      ],
    });

    const times = toLocalTimes(slots);
    expect(times.length).toBeGreaterThan(0);
    expect(times).not.toContain("10:00");
  });

  it("caso 3: overlap parcial (existente 10:00-11:00, candidato 10:30-11:30) falha", () => {
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 60,
      now: NOW,
      rules: [rule()],
      existingBookings: [
        { startsAt: utc("2026-01-05T13:00:00Z"), endsAt: utc("2026-01-05T14:00:00Z") },
      ],
    });

    const times = toLocalTimes(slots);
    expect(times.length).toBeGreaterThan(0);
    expect(times).not.toContain("10:30");
  });

  it("caso 4: horários adjacentes (existente 10:00-11:00, candidato 11:00-12:00) passa sem buffer", () => {
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 60,
      now: NOW,
      rules: [rule()],
      existingBookings: [
        { startsAt: utc("2026-01-05T13:00:00Z"), endsAt: utc("2026-01-05T14:00:00Z") },
      ],
    });

    expect(toLocalTimes(slots)).toContain("11:00");
  });

  it("caso 5: buffer depois do serviço bloqueia slot que antes era adjacente", () => {
    // Sem buffer, 10:00 (60min) encostaria exatamente no booking das 11:00-12:00.
    const withoutBuffer = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 60,
      now: NOW,
      rules: [rule()],
      existingBookings: [
        { startsAt: utc("2026-01-05T14:00:00Z"), endsAt: utc("2026-01-05T15:00:00Z") },
      ],
    });
    expect(toLocalTimes(withoutBuffer)).toContain("10:00");

    const withBuffer = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 60,
      bufferAfterMinutes: 15,
      now: NOW,
      rules: [rule()],
      existingBookings: [
        { startsAt: utc("2026-01-05T14:00:00Z"), endsAt: utc("2026-01-05T15:00:00Z") },
      ],
    });
    expect(toLocalTimes(withBuffer)).not.toContain("10:00");
  });

  it("caso 6: bloqueio parcial remove só os slots que caem dentro do bloqueio", () => {
    const exceptions: AvailabilityExceptionInput[] = [
      { type: "BLOCK", startsAt: utc("2026-01-05T13:00:00Z"), endsAt: utc("2026-01-05T13:30:00Z") },
    ];
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 30,
      now: NOW,
      rules: [rule()],
      exceptions,
    });

    const times = toLocalTimes(slots);
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:15");
    expect(times).toContain("09:30");
    expect(times).toContain("10:30");
  });

  it("caso 7: dia totalmente bloqueado não gera nenhum slot", () => {
    const exceptions: AvailabilityExceptionInput[] = [
      { type: "BLOCK", startsAt: utc("2026-01-05T12:00:00Z"), endsAt: utc("2026-01-05T15:00:00Z") },
    ];
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 30,
      now: NOW,
      rules: [rule()],
      exceptions,
    });

    expect(slots).toHaveLength(0);
  });

  it("caso 8: disponibilidade extraordinária gera slots fora da regra normal", () => {
    // Sem regra nenhuma pra terça (dayOfWeek 2) -> só a exceção AVAILABLE libera o dia.
    const tuesday = "2026-01-06";
    const exceptions: AvailabilityExceptionInput[] = [
      { type: "AVAILABLE", startsAt: utc("2026-01-06T13:00:00Z"), endsAt: utc("2026-01-06T14:00:00Z") },
    ];
    const slots = getAvailableSlots({
      date: tuesday,
      timezone: TZ,
      serviceDurationMinutes: 30,
      now: NOW,
      rules: [rule({ dayOfWeek: 1 })],
      exceptions,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(toLocalTimes(slots)).toContain("10:00");
  });

  it("caso 9: fusos diferentes produzem instantes UTC diferentes pra mesma regra local", () => {
    const saoPauloSlots = getAvailableSlots({
      date: MONDAY,
      timezone: "America/Sao_Paulo",
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 60,
      now: NOW,
      rules: [rule({ startTime: "09:00", endTime: "10:00" })],
    });
    const tokyoSlots = getAvailableSlots({
      date: MONDAY,
      timezone: "Asia/Tokyo",
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 60,
      now: NOW,
      rules: [rule({ startTime: "09:00", endTime: "10:00" })],
    });

    expect(saoPauloSlots[0]?.toISOString()).toBe("2026-01-05T12:00:00.000Z");
    expect(tokyoSlots[0]?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(saoPauloSlots[0]?.getTime()).not.toBe(tokyoSlots[0]?.getTime());
  });

  it("caso 10: virada de dia — regra terminando à noite não vaza slot pro dia seguinte", () => {
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 30,
      now: NOW,
      rules: [rule({ startTime: "23:00", endTime: "23:59" })],
    });

    // 23:00 local de 05/01 é 02:00 UTC de 06/01 — precisa continuar sendo "o dia 05/01 local".
    for (const slot of slots) {
      const localDate = slot.toLocaleDateString("en-CA", { timeZone: TZ });
      expect(localDate).toBe(MONDAY);
    }
    expect(toLocalTimes(slots)).toContain("23:00");
  });

  it("caso 11: DST — mesma regra local produz offsets UTC diferentes conforme a data", () => {
    const beforeDst = getAvailableSlots({
      date: "2026-01-08", // horário padrão (EST, UTC-5)
      timezone: "America/New_York",
      serviceDurationMinutes: 30,
      now: NOW,
      rules: [rule({ dayOfWeek: 4, startTime: "09:00", endTime: "10:00" })],
    });
    const afterDst = getAvailableSlots({
      date: "2026-03-09", // já em horário de verão (EDT, UTC-4)
      timezone: "America/New_York",
      serviceDurationMinutes: 30,
      now: NOW,
      rules: [rule({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" })],
    });

    expect(beforeDst[0]?.toISOString()).toBe("2026-01-08T14:00:00.000Z");
    expect(afterDst[0]?.toISOString()).toBe("2026-03-09T13:00:00.000Z");
  });

  // Caso 12 (duas requisições simultâneas pro mesmo intervalo) não se aplica aqui —
  // essa função é pura e não sabe de concorrência de escrita. É coberto no Step 5
  // com um teste de integração real contra o Postgres (exclusion constraint GiST).

  it("respeita antecedência mínima (minimumBookingNoticeMinutes)", () => {
    const now = utc("2026-01-05T11:50:00Z"); // 08:50 local
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 30,
      minimumBookingNoticeMinutes: 60,
      now,
      rules: [rule()],
    });

    expect(toLocalTimes(slots)).not.toContain("09:00");
    expect(toLocalTimes(slots)).toContain("10:00");
  });

  it("respeita limite máximo de antecedência (maximumBookingAdvanceDays)", () => {
    const now = utc("2025-01-01T00:00:00Z");
    const slots = getAvailableSlots({
      date: MONDAY,
      timezone: TZ,
      serviceDurationMinutes: 30,
      maximumBookingAdvanceDays: 30,
      now,
      rules: [rule()],
    });

    expect(slots).toHaveLength(0);
  });
});
