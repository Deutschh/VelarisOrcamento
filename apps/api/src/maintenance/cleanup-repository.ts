export interface CleanupExpiredRecordsResult {
  expiredDraftQuoteRequests: number;
  expiredIdempotencyKeys: number;
  expiredRecoveryCodes: number;
}

export interface MaintenanceCleanupRepository {
  cleanupExpiredRecords(now: Date): Promise<CleanupExpiredRecordsResult>;
}
