import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required (generate with: npx auth secret)"),
  AUTH_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = loadEnv();
