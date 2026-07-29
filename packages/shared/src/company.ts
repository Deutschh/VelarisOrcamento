import type { CompanyMemberRole, CompanyProfileStatus, CompanyStatus } from "./auth.js";

export interface CompanyAccountStatus {
  companyId: string;
  tradingName: string;
  slug: string;
  status: CompanyStatus;
  profileStatus: CompanyProfileStatus;
  memberRole: CompanyMemberRole;
  ownerEmail: string;
  activatedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
}
