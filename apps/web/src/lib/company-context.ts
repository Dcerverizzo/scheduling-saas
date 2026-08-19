import "server-only";
import { notFound } from "next/navigation";
import { prisma, type Company, type CompanyMember } from "@scheduling-saas/database";
import { requireSession } from "@/lib/session";

// A "empresa ativa" não fica em sessão/cookie — o slug na URL já isola o tenant,
// e a membership é sempre reconferida fresca no banco (nunca confiada via JWT
// cacheado, que pode ficar desatualizado por até a duração da sessão).
export async function requireCompanyContext(companySlug: string): Promise<{
  userId: string;
  company: Company;
  membership: CompanyMember;
}> {
  const session = await requireSession();

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company || company.deletedAt) {
    notFound();
  }

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: session.user.id } },
  });
  if (!membership) {
    notFound();
  }

  return { userId: session.user.id, company, membership };
}

export async function requireCompanyOwner(companySlug: string) {
  const context = await requireCompanyContext(companySlug);
  if (context.membership.role !== "OWNER") {
    notFound();
  }
  return context;
}
