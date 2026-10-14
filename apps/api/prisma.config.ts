import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Optional so `prisma generate` works in CI; migrate commands still require it
  ...(url ? { datasource: { url } } : {}),
});
