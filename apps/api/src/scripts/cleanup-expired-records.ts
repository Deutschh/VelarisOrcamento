import { env } from "../config/env.js";
import { createDatabaseClient } from "../db/client.js";
import { logger } from "../lib/logger.js";
import { DrizzleMaintenanceCleanupRepository } from "../maintenance/drizzle-cleanup-repository.js";
import { MaintenanceCleanupService } from "../maintenance/cleanup-service.js";

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to clean expired records.");
  }

  const { pool, db } = createDatabaseClient(env.DATABASE_URL);
  const service = new MaintenanceCleanupService({
    repository: new DrizzleMaintenanceCleanupRepository(db),
  });

  try {
    const result = await service.cleanupExpiredRecords();
    logger.info({ result }, "Expired records cleanup finished");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  logger.error({ error }, "Expired records cleanup failed");
  process.exitCode = 1;
});
