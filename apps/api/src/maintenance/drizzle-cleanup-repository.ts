import { and, eq, lt } from "drizzle-orm";

import { idempotencyKeys, quoteRequests, recoveryCodes } from "@velaris/database-schema";
import type { createDatabaseClient } from "../db/client.js";
import type {
  CleanupExpiredRecordsResult,
  MaintenanceCleanupRepository,
} from "./cleanup-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];

export class DrizzleMaintenanceCleanupRepository implements MaintenanceCleanupRepository {
  constructor(private readonly db: Database) {}

  async cleanupExpiredRecords(now: Date): Promise<CleanupExpiredRecordsResult> {
    return this.db.transaction(async (tx) => {
      const expiredDrafts = await tx
        .delete(quoteRequests)
        .where(and(eq(quoteRequests.status, "draft"), lt(quoteRequests.expiresAt, now)))
        .returning({ id: quoteRequests.id });
      const expiredIdempotencyRows = await tx
        .delete(idempotencyKeys)
        .where(lt(idempotencyKeys.expiresAt, now))
        .returning({ id: idempotencyKeys.id });
      const expiredRecoveryRows = await tx
        .delete(recoveryCodes)
        .where(lt(recoveryCodes.expiresAt, now))
        .returning({ id: recoveryCodes.id });

      return {
        expiredDraftQuoteRequests: expiredDrafts.length,
        expiredIdempotencyKeys: expiredIdempotencyRows.length,
        expiredRecoveryCodes: expiredRecoveryRows.length,
      };
    });
  }
}
