"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@scheduling-saas/database";
import { generateTempPassword } from "@scheduling-saas/domain";
import { createStaffSchema } from "@scheduling-saas/validation";
import { requireCompanyOwner } from "@/lib/company-context";

export async function createStaffAction(
  companySlug: string,
  formData: FormData,
): Promise<{ error: string | null; tempPassword?: string; staffEmail?: string }> {
  const { company } = await requireCompanyOwner(companySlug);

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira nome e e-mail." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Já existe um usuário com esse e-mail." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await tx.companyMember.create({
      data: { companyId: company.id, userId: user.id, role: "STAFF" },
    });

    await tx.staffProfile.create({
      data: {
        companyId: company.id,
        userId: user.id,
        displayName: parsed.data.name,
        phone: parsed.data.phone,
      },
    });
  });

  revalidatePath(`/app/${companySlug}/staff`);
  return { error: null, tempPassword, staffEmail: parsed.data.email };
}

export async function toggleStaffActiveAction(companySlug: string, staffProfileId: string) {
  const { company } = await requireCompanyOwner(companySlug);

  // staffProfileId + companyId juntos no where — nunca confiar que o ID sozinho
  // pertence a essa empresa (proteção IDOR/BOLA).
  const staffProfile = await prisma.staffProfile.findFirst({
    where: { id: staffProfileId, companyId: company.id },
  });
  if (!staffProfile) {
    return;
  }

  await prisma.staffProfile.update({
    where: { id: staffProfile.id },
    data: { active: !staffProfile.active },
  });

  revalidatePath(`/app/${companySlug}/staff`);
}
