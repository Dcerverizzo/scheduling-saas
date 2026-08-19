"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@scheduling-saas/database";
import { parseCentsFromDecimalString } from "@scheduling-saas/domain";
import { createServiceSchema } from "@scheduling-saas/validation";
import { requireCompanyOwner } from "@/lib/company-context";

type ActionState = { error: string | null };

function parseServiceForm(formData: FormData) {
  return createServiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    durationMinutes: formData.get("durationMinutes"),
    bufferBeforeMinutes: formData.get("bufferBeforeMinutes") || 0,
    bufferAfterMinutes: formData.get("bufferAfterMinutes") || 0,
    price: formData.get("price"),
    staffIds: formData.getAll("staffIds"),
  });
}

export async function createServiceAction(
  companySlug: string,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireCompanyOwner(companySlug);

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira nome, duração e preço." };
  }

  const priceInCents = parseCentsFromDecimalString(parsed.data.price);
  if (priceInCents === null || priceInCents < 0) {
    return { error: "Preço inválido." };
  }

  // staffIds do form são só sugestão do cliente — restringe pra staff que realmente
  // pertence a essa empresa antes de gravar a relação (proteção IDOR).
  const validStaffIds = await prisma.staffProfile.findMany({
    where: { companyId: company.id, id: { in: parsed.data.staffIds } },
    select: { id: true },
  });

  await prisma.service.create({
    data: {
      companyId: company.id,
      name: parsed.data.name,
      description: parsed.data.description,
      durationMinutes: parsed.data.durationMinutes,
      bufferBeforeMinutes: parsed.data.bufferBeforeMinutes,
      bufferAfterMinutes: parsed.data.bufferAfterMinutes,
      priceInCents,
      staff: {
        create: validStaffIds.map((staff) => ({ staffId: staff.id })),
      },
    },
  });

  revalidatePath(`/app/${companySlug}/services`);
  return { error: null };
}

export async function toggleServiceActiveAction(companySlug: string, serviceId: string) {
  const { company } = await requireCompanyOwner(companySlug);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, companyId: company.id },
  });
  if (!service) {
    return;
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { active: !service.active },
  });

  revalidatePath(`/app/${companySlug}/services`);
}
