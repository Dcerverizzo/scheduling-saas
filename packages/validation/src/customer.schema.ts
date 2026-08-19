import { z } from "zod";

export const customerSignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().min(8).max(20),
  password: z.string().min(8).max(72),
});
