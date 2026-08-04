import { describe, expect, it } from "vitest";

import type { MaintenanceCleanupRepository } from "./cleanup-repository.js";
import { MaintenanceCleanupService } from "./cleanup-service.js";

describe("MaintenanceCleanupService", () => {
  it("cleans expired records using the configured clock", async () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    let receivedNow: Date | null = null;
    const repository: MaintenanceCleanupRepository = {
      async cleanupExpiredRecords(inputNow) {
        receivedNow = inputNow;

        return {
          expiredDraftQuoteRequests: 2,
          expiredIdempotencyKeys: 3,
          expiredRecoveryCodes: 1,
        };
      },
    };
    const service = new MaintenanceCleanupService({
      repository,
      now: () => now,
    });

    const result = await service.cleanupExpiredRecords();

    expect(receivedNow).toBe(now);
    expect(result).toEqual({
      expiredDraftQuoteRequests: 2,
      expiredIdempotencyKeys: 3,
      expiredRecoveryCodes: 1,
    });
  });
});
