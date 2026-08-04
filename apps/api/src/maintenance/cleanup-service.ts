import type {
  CleanupExpiredRecordsResult,
  MaintenanceCleanupRepository,
} from "./cleanup-repository.js";

export interface MaintenanceCleanupServiceDependencies {
  repository: MaintenanceCleanupRepository;
  now?: () => Date;
}

export class MaintenanceCleanupService {
  constructor(private readonly dependencies: MaintenanceCleanupServiceDependencies) {}

  async cleanupExpiredRecords(): Promise<CleanupExpiredRecordsResult> {
    return this.dependencies.repository.cleanupExpiredRecords(this.now());
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
}
