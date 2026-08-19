"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { prisma } from "@scheduling-saas/database";
import {
  createAvailabilityExceptionSchema,
  createAvailabilityRuleSchema,
} from "@scheduling-saas/validation";
import { requireCompanyOwner } from "@/lib/company-context";

type ActionState = { error: string | null };

export async function createAvailabilityRuleAction(
  companySlug: string,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireCompanyOwner(companySlug);

  const parsed = createAvailabilityRuleSchema.safeParse({
    staffId: formData.get("staffId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const staff = await prisma.staffProfile.findFirst({
    where: { id: parsed.data.staffId, companyId: company.id },
  });
  if (!staff) {
    return { error: "Profissional inválido." };
  }

  await prisma.availabilityRule.create({
    data: {
      companyId: company.id,
      staffId: staff.id,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    },
  });

  revalidatePath(`/app/${companySlug}/availability`);
  return { error: null };
}

export async function deleteAvailabilityRuleAction(companySlug: string, ruleId: string) {
  const { company } = await requireCompanyOwner(companySlug);

  await prisma.availabilityRule.deleteMany({
    where: { id: ruleId, companyId: company.id },
  });

  revalidatePath(`/app/${companySlug}/availability`);
}

export async function createAvailabilityExceptionAction(
  companySlug: string,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireCompanyOwner(companySlug);

  const parsed = createAvailabilityExceptionSchema.safeParse({
    staffId: formData.get("staffId"),
    type: formData.get("type"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const staff = await prisma.staffProfile.findFirst({
    where: { id: parsed.data.staffId, companyId: company.id },
  });
  if (!staff) {
    return { error: "Profissional inválido." };
  }

  // Os inputs datetime-local não carregam fuso — são horário LOCAL da empresa.
  const startsAt = DateTime.fromISO(parsed.data.startsAt, { zone: company.timezone }).toJSDate();
  const endsAt = DateTime.fromISO(parsed.data.endsAt, { zone: company.timezone }).toJSDate();

  await prisma.availabilityException.create({
    data: {
      companyId: company.id,
      staffId: staff.id,
      type: parsed.data.type,
      startsAt,
      endsAt,
      reason: parsed.data.reason,
    },
  });

  revalidatePath(`/app/${companySlug}/availability`);
  return { error: null };
}

export async function deleteAvailabilityExceptionAction(companySlug: string, exceptionId: string) {
  const { company } = await requireCompanyOwner(companySlug);

  await prisma.availabilityException.deleteMany({
    where: { id: exceptionId, companyId: company.id },
  });

  revalidatePath(`/app/${companySlug}/availability`);
}
