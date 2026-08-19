import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";

// Teste de integração real contra o Postgres do docker-compose (não mocka nada) —
// cobre o caso 12 do item 25 do PRD: duas requisições simultâneas pro mesmo
// intervalo não podem, nunca, resultar em dois bookings confirmados pro mesmo staff.
describe("EXCLUDE constraint bookings_no_overlap_per_staff (integração real)", () => {
  const runId = randomUUID().slice(0, 8);
  let companyId: string;
  let staffAId: string;
  let staffBId: string;
  let serviceId: string;
  let customerId: string;

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        name: "Owner Teste",
        email: `owner-${runId}@test.local`,
        passwordHash: "x",
      },
    });
    const staffUserA = await prisma.user.create({
      data: { name: "Staff A", email: `staff-a-${runId}@test.local`, passwordHash: "x" },
    });
    const staffUserB = await prisma.user.create({
      data: { name: "Staff B", email: `staff-b-${runId}@test.local`, passwordHash: "x" },
    });
    const customerUser = await prisma.user.create({
      data: { name: "Cliente Teste", email: `customer-${runId}@test.local`, passwordHash: "x" },
    });

    const company = await prisma.company.create({
      data: { name: "Empresa Teste", slug: `empresa-teste-${runId}` },
    });
    companyId = company.id;

    await prisma.companyMember.create({
      data: { companyId, userId: owner.id, role: "OWNER" },
    });

    const staffA = await prisma.staffProfile.create({
      data: { companyId, userId: staffUserA.id, displayName: "Staff A" },
    });
    staffAId = staffA.id;
    const staffB = await prisma.staffProfile.create({
      data: { companyId, userId: staffUserB.id, displayName: "Staff B" },
    });
    staffBId = staffB.id;

    const service = await prisma.service.create({
      data: { companyId, name: "Serviço Teste", durationMinutes: 60, priceInCents: 5000 },
    });
    serviceId = service.id;

    const customer = await prisma.customerProfile.create({
      data: { userId: customerUser.id },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { companyId } });
    await prisma.service.deleteMany({ where: { companyId } });
    await prisma.staffProfile.deleteMany({ where: { companyId } });
    await prisma.companyMember.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
    await prisma.customerProfile.delete({ where: { id: customerId } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `${runId}@test.local` } } });
    await prisma.$disconnect();
  });

  function bookingData(overrides: { startsAt: Date; endsAt: Date; staffId?: string }) {
    return {
      companyId,
      staffId: overrides.staffId ?? staffAId,
      serviceId,
      customerId,
      startsAt: overrides.startsAt,
      endsAt: overrides.endsAt,
      status: "CONFIRMED" as const,
      customerNameSnapshot: "Cliente Teste",
      serviceNameSnapshot: "Serviço Teste",
      serviceDurationSnapshot: 60,
      servicePriceSnapshot: 5000,
    };
  }

  it("rejeita duas escritas concorrentes pro mesmo staff e mesmo intervalo — só uma vence", async () => {
    const startsAt = new Date("2027-01-04T13:00:00Z");
    const endsAt = new Date("2027-01-04T14:00:00Z");

    const results = await Promise.allSettled([
      prisma.booking.create({ data: bookingData({ startsAt, endsAt }) }),
      prisma.booking.create({ data: bookingData({ startsAt, endsAt }) }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const survivors = await prisma.booking.findMany({
      where: { companyId, staffId: staffAId, startsAt },
    });
    expect(survivors).toHaveLength(1);
  });

  it("rejeita overlap parcial pro mesmo staff", async () => {
    const startsAt = new Date("2027-01-05T13:00:00Z");
    const endsAt = new Date("2027-01-05T14:00:00Z");
    await prisma.booking.create({ data: bookingData({ startsAt, endsAt }) });

    await expect(
      prisma.booking.create({
        data: bookingData({
          startsAt: new Date("2027-01-05T13:30:00Z"),
          endsAt: new Date("2027-01-05T14:30:00Z"),
        }),
      }),
    ).rejects.toThrow();
  });

  it("permite horários adjacentes (sem overlap) pro mesmo staff", async () => {
    const startsAt = new Date("2027-01-06T13:00:00Z");
    const endsAt = new Date("2027-01-06T14:00:00Z");
    await prisma.booking.create({ data: bookingData({ startsAt, endsAt }) });

    const adjacent = await prisma.booking.create({
      data: bookingData({ startsAt: endsAt, endsAt: new Date("2027-01-06T15:00:00Z") }),
    });
    expect(adjacent.id).toBeDefined();
  });

  it("permite o mesmo intervalo pra staff diferentes", async () => {
    const startsAt = new Date("2027-01-07T13:00:00Z");
    const endsAt = new Date("2027-01-07T14:00:00Z");
    await prisma.booking.create({ data: bookingData({ startsAt, endsAt, staffId: staffAId }) });

    const otherStaff = await prisma.booking.create({
      data: bookingData({ startsAt, endsAt, staffId: staffBId }),
    });
    expect(otherStaff.id).toBeDefined();
  });

  it("um booking CANCELLED não bloqueia um novo booking no mesmo horário", async () => {
    const startsAt = new Date("2027-01-08T13:00:00Z");
    const endsAt = new Date("2027-01-08T14:00:00Z");
    const cancelled = await prisma.booking.create({
      data: bookingData({ startsAt, endsAt }),
    });
    await prisma.booking.update({
      where: { id: cancelled.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    const newBooking = await prisma.booking.create({
      data: bookingData({ startsAt, endsAt }),
    });
    expect(newBooking.id).toBeDefined();
  });
});
