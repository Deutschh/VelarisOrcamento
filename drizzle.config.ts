import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./database/schemas/index.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://user:password@localhost:5432/velaris_placeholder",
  },
  strict: true,
  verbose: true,
});
