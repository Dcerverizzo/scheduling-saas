"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@scheduling-saas/database";
import { updateCompanyPaymentSettingsSchema, updateCompanySchema } from "@scheduling-saas/validation";
import { requireCompanyOwner } from "@/lib/company-context";

export async function updateCompanyAction(companySlug: string, formData: FormData) {
  const { company } = await requireCompanyOwner(companySlug);

  const parsed = updateCompanySchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
  });
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira os campos e tente novamente." };
  }

  // company.id vem do contexto já verificado (fresh do banco) — nunca do formData/URL do cliente.
  await prisma.company.update({
    where: { id: company.id },
    data: parsed.data,
  });

  revalidatePath(`/app/${companySlug}/settings`);
  return { error: null };
}

export async function updatePaymentSettingsAction(companySlug: string, formData: FormData) {
  const { company } = await requireCompanyOwner(companySlug);

  const parsed = updateCompanyPaymentSettingsSchema.safeParse({
    paymentRequirement: formData.get("paymentRequirement"),
    depositPercentage: formData.get("depositPercentage") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos. Confira os campos e tente novamente." };
  }

  // company.id vem do contexto já verificado — nunca do formData/URL do cliente (mesmo padrão
  // IDOR-safe de updateCompanyAction).
  await prisma.company.update({
    where: { id: company.id },
    data: {
      paymentRequirement: parsed.data.paymentRequirement,
      depositPercentage: parsed.data.paymentRequirement === "DEPOSIT" ? parsed.data.depositPercentage : null,
    },
  });

  revalidatePath(`/app/${companySlug}/settings`);
  return { error: null };
}
