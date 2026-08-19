import path from "node:path";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";

loadEnv({ path: path.resolve(import.meta.dirname, "../../../.env") });

const { prisma } = await import("../src/client.js");

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
    },
  });
}

async function main() {
  const owner = await upsertUser({
    name: "Daniel (Owner)",
    email: "owner@example.com",
    password: "password123",
    phone: "+5517999999001",
  });

  const staffJoao = await upsertUser({
    name: "João",
    email: "joao@example.com",
    password: "password123",
    phone: "+5517999999002",
  });

  const staffPedro = await upsertUser({
    name: "Pedro",
    email: "pedro@example.com",
    password: "password123",
    phone: "+5517999999003",
  });

  const customer = await upsertUser({
    name: "Maria (Cliente)",
    email: "customer@example.com",
    password: "password123",
    phone: "+5517999999004",
  });
  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id, phone: customer.phone },
  });

  const company = await prisma.company.upsert({
    where: { slug: "barbearia-do-joao" },
    update: {},
    create: {
      name: "Barbearia do João",
      slug: "barbearia-do-joao",
      phone: "+5517999999000",
      timezone: "America/Sao_Paulo",
      city: "São José do Rio Preto",
      state: "SP",
      country: "BR",
    },
  });

  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: company.id, userId: owner.id } },
    update: {},
    create: { companyId: company.id, userId: owner.id, role: "OWNER" },
  });

  const staffProfiles = [];
  for (const staff of [staffJoao, staffPedro]) {
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: staff.id } },
      update: {},
      create: { companyId: company.id, userId: staff.id, role: "STAFF" },
    });

    const profile = await prisma.staffProfile.upsert({
      where: { companyId_userId: { companyId: company.id, userId: staff.id } },
      update: {},
      create: {
        companyId: company.id,
        userId: staff.id,
        displayName: staff.name,
        phone: staff.phone,
      },
    });
    staffProfiles.push(profile);
  }

  const services = [
    { name: "Corte", durationMinutes: 30, priceInCents: 4000 },
    { name: "Barba", durationMinutes: 20, priceInCents: 2500 },
    { name: "Corte + Barba", durationMinutes: 50, priceInCents: 6000 },
  ];
  for (const serviceInput of services) {
    const existing = await prisma.service.findFirst({
      where: { companyId: company.id, name: serviceInput.name },
    });
    if (existing) continue;

    await prisma.service.create({
      data: {
        companyId: company.id,
        name: serviceInput.name,
        durationMinutes: serviceInput.durationMinutes,
        priceInCents: serviceInput.priceInCents,
        staff: {
          create: staffProfiles.map((profile) => ({ staffId: profile.id })),
        },
      },
    });
  }

  // Segunda a sexta, 09:00-18:00, pra todo mundo da equipe.
  for (const profile of staffProfiles) {
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      const existingRule = await prisma.availabilityRule.findFirst({
        where: { staffId: profile.id, dayOfWeek },
      });
      if (existingRule) continue;

      await prisma.availabilityRule.create({
        data: {
          companyId: company.id,
          staffId: profile.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
        },
      });
    }
  }

  console.log("[seed] done:", {
    company: company.slug,
    users: [owner.email, staffJoao.email, staffPedro.email, customer.email],
    services: services.map((s) => s.name),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
