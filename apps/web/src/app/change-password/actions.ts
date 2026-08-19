"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@scheduling-saas/database";
import { auth, signOut } from "@/auth";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo de 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // Força novo login: o JWT em sessão só recalcula mustChangePassword no sign-in,
  // então não dá pra confiar que o token atual já reflete a troca.
  await signOut({ redirectTo: "/login" });
  return { error: null };
}
