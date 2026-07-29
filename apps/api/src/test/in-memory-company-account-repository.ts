import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "../company/company-account-repository.js";

export class InMemoryCompanyAccountRepository implements CompanyAccountRepository {
  readonly accounts = new Map<string, PersistedCompanyAccountStatus>();

  async findCompanyAccountByUserId(
    userId: string,
  ): Promise<PersistedCompanyAccountStatus | null> {
    return this.accounts.get(userId) ?? null;
  }
}
