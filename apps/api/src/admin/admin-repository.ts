import type {
  CompanyLifecyclePatch,
  CompanyLifecycleProfileStatus,
  CompanyLifecycleState,
  CompanyLifecycleStatus,
  CompanyLifecycleSubscriptionStatus,
} from "@velaris/domain";
import type { AdminCompanyListQuery } from "@velaris/shared";

export interface PersistedAdminCompany extends CompanyLifecycleState {
  id: string;
  tradingName: string;
  legalName: string | null;
  documentNumber: string | null;
  slug: string;
  timezone: string;
  status: CompanyLifecycleStatus;
  profileStatus: CompanyLifecycleProfileStatus;
  subscriptionStatus: CompanyLifecycleSubscriptionStatus;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: Date;
}

export interface PersistedAdminCompanyNote {
  id: string;
  note: string;
  authorName: string | null;
  createdAt: Date;
}

export interface PersistedAdminAuditLog {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PersistCompanyActionInput {
  companyId: string;
  actorUserId: string;
  action: string;
  patch: CompanyLifecyclePatch;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateInternalNoteInput {
  companyId: string;
  actorUserId: string;
  note: string;
}

export interface AdminRepository {
  listCompanies(query: AdminCompanyListQuery): Promise<PersistedAdminCompany[]>;
  findCompanyById(id: string): Promise<PersistedAdminCompany | null>;
  listCompanyNotes(companyId: string): Promise<PersistedAdminCompanyNote[]>;
  listCompanyAuditLogs(companyId: string): Promise<PersistedAdminAuditLog[]>;
  persistCompanyAction(input: PersistCompanyActionInput): Promise<void>;
  createInternalNote(input: CreateInternalNoteInput): Promise<void>;
}
