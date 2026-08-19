import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// .env vive na raiz do monorepo (fonte única para web, whatsapp-worker e database).
loadEnv({ path: path.resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
