import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@scheduling-saas/database";
import type { CompanyRole } from "@scheduling-saas/domain";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || user.deletedAt) return null;

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.userId = user.id;
        token.mustChangePassword = user.mustChangePassword ?? false;

        const memberships = await prisma.companyMember.findMany({
          where: { userId: user.id },
          select: { companyId: true, role: true },
        });
        token.memberships = memberships as { companyId: string; role: CompanyRole }[];
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.userId;
      session.user.mustChangePassword = token.mustChangePassword;
      session.user.memberships = token.memberships;
      return session;
    },
  },
});
