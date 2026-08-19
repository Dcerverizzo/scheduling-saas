"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@scheduling-saas/database";
import { normalizePhoneToE164 } from "@scheduling-saas/domain";
import { customerSignupSchema } from "@scheduling-saas/validation";
import { signIn } from "@/auth";

export async function customerSignupAction(formData: FormData): Promise<{ error: string | null }> {
  const next = formData.get("next");
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/app";

  const parsed = customerSignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Já existe uma conta com esse e-mail. Faça login." };
  }

  const phone = normalizePhoneToE164(parsed.data.phone);
  if (!phone) {
    return { error: "Telefone inválido." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, phone, passwordHash },
    });
    await tx.customerProfile.create({ data: { userId: user.id, phone } });
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: nextPath,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Conta criada, mas não foi possível entrar automaticamente. Faça login." };
    }
    throw error;
  }

  redirect(nextPath);
}
