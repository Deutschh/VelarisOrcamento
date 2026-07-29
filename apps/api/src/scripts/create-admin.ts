import "dotenv/config";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { users } from "@velaris/database-schema";
import { argon2idPasswordHasher } from "../auth/password.js";
import { createDatabaseClient } from "../db/client.js";

const adminEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_NAME: z.string().trim().min(2),
  ADMIN_EMAIL: z.string().trim().email(),
  ADMIN_PASSWORD: z.string().min(12),
});

const adminEnv = adminEnvSchema.parse(process.env);
const { db, pool } = createDatabaseClient(adminEnv.DATABASE_URL);
const normalizedEmail = adminEnv.ADMIN_EMAIL.toLowerCase();

try {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${normalizedEmail})`)
    .limit(1);

  if (existingUser) {
    if (existingUser.role !== "admin") {
      throw new Error("A non-admin user already exists with ADMIN_EMAIL.");
    }

    console.log("Admin user already exists.");
    process.exitCode = 0;
  } else {
    const passwordHash = await argon2idPasswordHasher.hash(adminEnv.ADMIN_PASSWORD);

    await db.insert(users).values({
      id: randomUUID(),
      name: adminEnv.ADMIN_NAME,
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    console.log("Admin user created.");
  }
} finally {
  await pool.end();
}
