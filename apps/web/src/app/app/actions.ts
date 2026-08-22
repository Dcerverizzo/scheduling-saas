"use server";

import { redirect } from "next/navigation";
import { prisma } from "@scheduling-saas/database";
import { isReservedSlug, slugify } from "@scheduling-saas/domain";
import { createCompanySchema } from "@scheduling-saas/validation";
import { auth } from "@/auth";

export async function createCompanyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    redirect("/app?error=1");
  }

  const baseSlug = slugify(parsed.data.name) || "empresa";
  let slug = baseSlug;
  let suffix = 1;
  while (isReservedSlug(slug) || (await prisma.company.findUnique({ where: { slug } }))) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      slug,
      phone: parsed.data.phone,
      timezone: parsed.data.timezone,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  redirect(`/app/${company.slug}`);
}
