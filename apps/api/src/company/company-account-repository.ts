import type {
  CompanyMemberRole,
  CompanyProfileStatus,
  CompanyStatus,
} from "@velaris/shared";

export interface PersistedCompanyAccountStatus {
  companyId: string;
  tradingName: string;
  slug: string;
  status: CompanyStatus;
  profileStatus: CompanyProfileStatus;
  memberRole: CompanyMemberRole;
  ownerEmail: string;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
}

export interface CompanyAccountRepository {
  findCompanyAccountByUserId(
    userId: string,
  ): Promise<PersistedCompanyAccountStatus | null>;
}
