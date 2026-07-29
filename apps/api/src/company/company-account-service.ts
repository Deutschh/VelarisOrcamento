import type { CompanyAccountStatus } from "@velaris/shared";

import { AppError } from "../lib/app-error.js";
import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "./company-account-repository.js";

export class CompanyAccountService {
  constructor(private readonly repository: CompanyAccountRepository) {}

  async getCompanyAccount(userId: string): Promise<CompanyAccountStatus> {
    const account = await this.repository.findCompanyAccountByUserId(userId);

    if (!account) {
      throw new AppError("Company account not found.", 404, "COMPANY_ACCOUNT_NOT_FOUND");
    }

    return toCompanyAccountStatus(account);
  }
}

function toCompanyAccountStatus(
  account: PersistedCompanyAccountStatus,
): CompanyAccountStatus {
  return {
    companyId: account.companyId,
    tradingName: account.tradingName,
    slug: account.slug,
    status: account.status,
    profileStatus: account.profileStatus,
    memberRole: account.memberRole,
    ownerEmail: account.ownerEmail,
    activatedAt: toIso(account.activatedAt),
    suspendedAt: toIso(account.suspendedAt),
    createdAt: account.createdAt.toISOString(),
  };
}

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}
