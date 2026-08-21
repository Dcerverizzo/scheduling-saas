import { prisma, type CustomerProfile } from "@scheduling-saas/database";

// Reaproveita o CustomerProfile guest existente pelo telefone (evita duplicar
// identidade a cada visita) — mas NUNCA casa contra o telefone de uma conta
// REAL (isGuest=false): isolamento de dado, quem só passou telefone no fluxo
// sem conta não pode herdar/ver histórico de uma conta de verdade que use o
// mesmo número. `phone` já deve vir normalizado em E.164 (feito na action).
export async function resolveGuestCustomer(input: { name: string; phone: string }): Promise<CustomerProfile> {
  const existing = await prisma.customerProfile.findFirst({
    where: { phone: input.phone, user: { isGuest: true } },
  });
  if (existing) {
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, phone: input.phone, isGuest: true },
    });
    return tx.customerProfile.create({ data: { userId: user.id, phone: input.phone } });
  });
}
