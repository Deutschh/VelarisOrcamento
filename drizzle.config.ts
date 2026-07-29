import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const isMigrateCommand = process.argv.some((arg) => arg.includes("migrate"));
const databaseUrl = process.env.DATABASE_URL;

if (isMigrateCommand && !databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

export default defineConfig({
  schema: "./database/schemas/index.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "postgresql://user:password@localhost:5432/velaris_placeholder",
  },
  strict: true,
  verbose: true,
});
