import type { AdminCompanyListQuery } from "@velaris/shared";
import type { CompanyPublicProfileSettings } from "@velaris/shared";
import type {
  AdminRepository,
  CreateInternalNoteInput,
  PersistCompanyActionInput,
  PersistedAdminAuditLog,
  PersistedAdminCompany,
  PersistedAdminCompanyNote,
  UpdateCompanyPublicProfileInput,
} from "../admin/admin-repository.js";

export class InMemoryAdminRepository implements AdminRepository {
  readonly companies = new Map<string, PersistedAdminCompany>();
  readonly publicProfiles = new Map<string, CompanyPublicProfileSettings>();
  readonly notes: PersistedAdminCompanyNote[] = [];
  readonly auditLogs: PersistedAdminAuditLog[] = [];

  async listCompanies(query: AdminCompanyListQuery): Promise<PersistedAdminCompany[]> {
    return Array.from(this.companies.values()).filter(
      (company) =>
        (!query.status || company.status === query.status) &&
        (!query.profileStatus || company.profileStatus === query.profileStatus),
    );
  }

  async findCompanyById(id: string): Promise<PersistedAdminCompany | null> {
    return this.companies.get(id) ?? null;
  }

  async findCompanyPublicProfile(
    companyId: string,
  ): Promise<CompanyPublicProfileSettings | null> {
    return this.publicProfiles.get(companyId) ?? null;
  }

  async listCompanyNotes(companyId: string): Promise<PersistedAdminCompanyNote[]> {
    return this.notes.filter((note) => note.id.startsWith(`${companyId}:`));
  }

  async listCompanyAuditLogs(companyId: string): Promise<PersistedAdminAuditLog[]> {
    return this.auditLogs.filter((auditLog) => auditLog.id.startsWith(`${companyId}:`));
  }

  async persistCompanyAction(input: PersistCompanyActionInput): Promise<void> {
    const company = this.companies.get(input.companyId);

    if (company) {
      this.companies.set(input.companyId, {
        ...company,
        ...input.patch,
      });
    }

    if (input.note) {
      this.notes.push({
        id: `${input.companyId}:note:${this.notes.length + 1}`,
        note: input.note,
        authorName: "Admin Teste",
        createdAt: new Date(),
      });
    }

    this.auditLogs.push({
      id: `${input.companyId}:audit:${this.auditLogs.length + 1}`,
      action: input.action,
      actorName: "Admin Teste",
      metadata: input.metadata ?? null,
      createdAt: new Date(),
    });
  }

  async createInternalNote(input: CreateInternalNoteInput): Promise<void> {
    this.notes.push({
      id: `${input.companyId}:note:${this.notes.length + 1}`,
      note: input.note,
      authorName: "Admin Teste",
      createdAt: new Date(),
    });

    this.auditLogs.push({
      id: `${input.companyId}:audit:${this.auditLogs.length + 1}`,
      action: "company.internal_note.created",
      actorName: "Admin Teste",
      metadata: null,
      createdAt: new Date(),
    });
  }

  async updateCompanyPublicProfile(
    input: UpdateCompanyPublicProfileInput,
  ): Promise<void> {
    this.publicProfiles.set(input.companyId, {
      nicheCode: input.profile.nicheCode,
      headline: input.profile.headline ?? null,
      description: input.profile.description ?? null,
      city: input.profile.city ?? null,
      state: input.profile.state ?? null,
      postalCode: input.profile.postalCode ?? null,
      neighborhood: input.profile.neighborhood ?? null,
      addressLine: input.profile.addressLine ?? null,
      addressComplement: input.profile.addressComplement ?? null,
      latitude: input.profile.latitude ?? null,
      longitude: input.profile.longitude ?? null,
      serviceRadiusKm: input.profile.serviceRadiusKm ?? null,
      serviceCities: input.profile.serviceCities,
      serviceNeighborhoods: input.profile.serviceNeighborhoods,
      logoUrl: input.profile.logoUrl ?? null,
      coverImageUrl: input.profile.coverImageUrl ?? null,
      primaryColor: input.profile.primaryColor ?? null,
      contactPhone: input.profile.contactPhone ?? null,
      contactWhatsapp: input.profile.contactWhatsapp ?? null,
      contactEmail: input.profile.contactEmail ?? null,
      websiteUrl: input.profile.websiteUrl ?? null,
      instagramUrl: input.profile.instagramUrl ?? null,
      terms: input.profile.terms ?? null,
      gallery: input.profile.gallery,
      services: input.profile.services,
      reviewAverage: null,
      reviewCount: 0,
    });

    this.auditLogs.push({
      id: `${input.companyId}:audit:${this.auditLogs.length + 1}`,
      action: "company.public_profile.updated",
      actorName: "Admin Teste",
      metadata: null,
      createdAt: new Date(),
    });
  }
}

export function createTestAdminCompany(
  input: Partial<PersistedAdminCompany> = {},
): PersistedAdminCompany {
  return {
    id: input.id ?? "company-1",
    tradingName: input.tradingName ?? "Empresa Teste",
    legalName: input.legalName ?? null,
    documentNumber: input.documentNumber ?? null,
    slug: input.slug ?? "empresa-teste",
    timezone: input.timezone ?? "America/Sao_Paulo",
    status: input.status ?? "pending",
    profileStatus: input.profileStatus ?? "draft",
    subscriptionStatus: input.subscriptionStatus ?? "pending_activation",
    activatedAt: input.activatedAt ?? null,
    suspendedAt: input.suspendedAt ?? null,
    profilePublishedAt: input.profilePublishedAt ?? null,
    profileUnpublishedAt: input.profileUnpublishedAt ?? null,
    ownerName: input.ownerName ?? "Dona Empresa",
    ownerEmail: input.ownerEmail ?? "empresa@example.com",
    createdAt: input.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
  };
}
