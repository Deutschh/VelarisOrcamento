import {
  CompanyLifecycleError,
  activateCompanyState,
  setCompanyProfilePublicationState,
  suspendCompanyState,
} from "@velaris/domain";
import type {
  AdminCompanyPublicProfileRequest,
  AdminCompanyActionRequest,
  AdminCompanyDetail,
  AdminCompanyListQuery,
  AdminCompanySummary,
  AdminPublishCompanyRequest,
  InternalNoteRequest,
} from "@velaris/shared";

import type { EmailAdapter } from "../notifications/email-adapter.js";
import { createDefaultPublicProfile } from "../public/public-profile.js";
import { CompanyLifecycleRuleError, CompanyNotFoundError } from "./admin-errors.js";
import type {
  AdminRepository,
  PersistCompanyActionInput,
  PersistedAdminAuditLog,
  PersistedAdminCompany,
  PersistedAdminCompanyNote,
} from "./admin-repository.js";

export interface AdminServiceDependencies {
  repository: AdminRepository;
  emailAdapter: EmailAdapter;
}

export class AdminService {
  constructor(private readonly dependencies: AdminServiceDependencies) {}

  async listCompanies(query: AdminCompanyListQuery): Promise<AdminCompanySummary[]> {
    const companies = await this.dependencies.repository.listCompanies(query);
    return companies.map(toCompanySummary);
  }

  async getCompany(id: string): Promise<AdminCompanyDetail> {
    const company = await this.getPersistedCompany(id);
    const [notes, auditLogs] = await Promise.all([
      this.dependencies.repository.listCompanyNotes(id),
      this.dependencies.repository.listCompanyAuditLogs(id),
    ]);
    const publicProfile =
      (await this.dependencies.repository.findCompanyPublicProfile(id)) ??
      createDefaultPublicProfile();

    return {
      ...toCompanySummary(company),
      legalName: company.legalName,
      documentNumber: company.documentNumber,
      timezone: company.timezone,
      publicProfile,
      notes: notes.map(toNote),
      auditLogs: auditLogs.map(toAuditLog),
    };
  }

  async activateCompany(
    id: string,
    actorUserId: string,
    input: AdminCompanyActionRequest,
  ): Promise<AdminCompanyDetail> {
    const company = await this.getPersistedCompany(id);
    const patch = activateCompanyState(company);

    await this.persistActionIfNeeded({
      company,
      actorUserId,
      action: "company.activated",
      patch,
      ...(input.note ? { note: input.note } : {}),
    });

    if (Object.keys(patch).length > 0 && company.ownerEmail) {
      await this.dependencies.emailAdapter.sendCompanyActivation({
        to: company.ownerEmail,
        companyName: company.tradingName,
      });
    }

    return this.getCompany(id);
  }

  async suspendCompany(
    id: string,
    actorUserId: string,
    input: AdminCompanyActionRequest,
  ): Promise<AdminCompanyDetail> {
    const company = await this.getPersistedCompany(id);
    const patch = suspendCompanyState(company);

    await this.persistActionIfNeeded({
      company,
      actorUserId,
      action: "company.suspended",
      patch,
      ...(input.note ? { note: input.note } : {}),
    });

    return this.getCompany(id);
  }

  async publishCompany(
    id: string,
    actorUserId: string,
    input: AdminPublishCompanyRequest,
  ): Promise<AdminCompanyDetail> {
    const company = await this.getPersistedCompany(id);

    try {
      const patch = setCompanyProfilePublicationState(company, input.published);
      await this.persistActionIfNeeded({
        company,
        actorUserId,
        action: input.published
          ? "company.profile.published"
          : "company.profile.unpublished",
        patch,
        ...(input.note ? { note: input.note } : {}),
      });
    } catch (error) {
      if (error instanceof CompanyLifecycleError) {
        throw new CompanyLifecycleRuleError(error.code, error.message);
      }

      throw error;
    }

    return this.getCompany(id);
  }

  async createInternalNote(
    id: string,
    actorUserId: string,
    input: InternalNoteRequest,
  ): Promise<AdminCompanyDetail> {
    await this.getPersistedCompany(id);
    await this.dependencies.repository.createInternalNote({
      companyId: id,
      actorUserId,
      note: input.note,
    });

    return this.getCompany(id);
  }

  async updateCompanyPublicProfile(
    id: string,
    actorUserId: string,
    input: AdminCompanyPublicProfileRequest,
  ): Promise<AdminCompanyDetail> {
    await this.getPersistedCompany(id);
    await this.dependencies.repository.updateCompanyPublicProfile({
      companyId: id,
      actorUserId,
      profile: input,
    });

    return this.getCompany(id);
  }

  private async getPersistedCompany(id: string): Promise<PersistedAdminCompany> {
    const company = await this.dependencies.repository.findCompanyById(id);

    if (!company) {
      throw new CompanyNotFoundError();
    }

    return company;
  }

  private async persistActionIfNeeded(input: {
    company: PersistedAdminCompany;
    actorUserId: string;
    action: string;
    patch: PersistCompanyActionInput["patch"];
    note?: string;
  }) {
    if (Object.keys(input.patch).length === 0 && !input.note) {
      return;
    }

    const metadata = {
      previousStatus: input.company.status,
      previousProfileStatus: input.company.profileStatus,
      nextPatch: input.patch,
      noteProvided: Boolean(input.note),
    };

    await this.dependencies.repository.persistCompanyAction({
      companyId: input.company.id,
      actorUserId: input.actorUserId,
      action: input.action,
      patch: input.patch,
      ...(input.note ? { note: input.note } : {}),
      metadata,
    });
  }
}

function toCompanySummary(company: PersistedAdminCompany): AdminCompanySummary {
  return {
    id: company.id,
    tradingName: company.tradingName,
    slug: company.slug,
    status: company.status,
    profileStatus: company.profileStatus,
    subscriptionStatus: company.subscriptionStatus,
    ownerName: company.ownerName,
    ownerEmail: company.ownerEmail,
    activatedAt: toIso(company.activatedAt),
    suspendedAt: toIso(company.suspendedAt),
    profilePublishedAt: toIso(company.profilePublishedAt),
    createdAt: company.createdAt.toISOString(),
  };
}

function toNote(note: PersistedAdminCompanyNote) {
  return {
    id: note.id,
    note: note.note,
    authorName: note.authorName,
    createdAt: note.createdAt.toISOString(),
  };
}

function toAuditLog(auditLog: PersistedAdminAuditLog) {
  return {
    id: auditLog.id,
    action: auditLog.action,
    actorName: auditLog.actorName,
    metadata: auditLog.metadata,
    createdAt: auditLog.createdAt.toISOString(),
  };
}

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}
