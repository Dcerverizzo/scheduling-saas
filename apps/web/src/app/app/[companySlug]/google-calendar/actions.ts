"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@scheduling-saas/database";
import { requireCompanyContext } from "@/lib/company-context";

export async function disconnectGoogleCalendarAction(companySlug: string) {
  const { userId, company } = await requireCompanyContext(companySlug);

  const staff = await prisma.staffProfile.findUnique({
    where: { companyId_userId: { companyId: company.id, userId } },
  });
  if (!staff) return;

  // Delete, não soft-disconnect: essa é uma ação deliberada do próprio staff (decisão 9
  // do design de Calendar no PRD) — o banner "desconectado" é só pra falha inesperada
  // de sync (status=ERROR), detectada em outro lugar, não pra esse caminho.
  await prisma.googleCalendarConnection.deleteMany({ where: { staffId: staff.id } });

  revalidatePath(`/app/${companySlug}/google-calendar`);
}
