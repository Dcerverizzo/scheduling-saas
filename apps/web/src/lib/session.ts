import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }
  return session;
}
