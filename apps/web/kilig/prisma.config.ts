import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  // .env may not exist in CI/production where vars are injected directly.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI runs (migrations, introspection) use the direct/Supavisor
    // session connection — the transaction pooler in DATABASE_URL (the
    // runtime client's URL) doesn't reliably support the advisory locks
    // DDL needs. Falls back to DATABASE_URL so a bare local setup where
    // DIRECT_URL isn't set still works. See .env.example.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
