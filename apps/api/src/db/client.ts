import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

export function createDatabaseClient(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return {
    pool,
    db: drizzle(pool),
  };
}
