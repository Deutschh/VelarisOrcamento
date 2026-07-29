import { and, eq } from "drizzle-orm";

import { companies, companyPublicProfiles } from "@velaris/database-schema";
import type { CompanyPublicProfileSettings } from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import { createDefaultPublicProfile, toKnownCategoryCode } from "./public-profile.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];

const publishedCompanyFilter = and(
  eq(companies.status, "active"),
  eq(companies.profileStatus, "published"),
);

export class DrizzlePublicCompanyRepository implements PublicCompanyRepository {
  constructor(private readonly db: Database) {}

  async listPublishedCompanies(): Promise<PersistedPublicCompany[]> {
    const rows = await this.db
      .select({
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(companies)
      .leftJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .where(publishedCompanyFilter);

    return rows.map((row) =>
      mapPublicCompany(row.company, row.profile ? mapPublicProfile(row.profile) : null),
    );
  }

  async findPublishedCompanyBySlug(slug: string): Promise<PersistedPublicCompany | null> {
    const [row] = await this.db
      .select({
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(companies)
      .leftJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .where(and(publishedCompanyFilter, eq(companies.slug, slug)))
      .limit(1);

    return row
      ? mapPublicCompany(row.company, row.profile ? mapPublicProfile(row.profile) : null)
      : null;
  }
}

function mapPublicCompany(
  company: typeof companies.$inferSelect,
  profile: CompanyPublicProfileSettings | null,
): PersistedPublicCompany {
  return {
    id: company.id,
    tradingName: company.tradingName,
    slug: company.slug,
    profile: profile ?? createDefaultPublicProfile(),
  };
}

function mapPublicProfile(
  row: typeof companyPublicProfiles.$inferSelect,
): CompanyPublicProfileSettings {
  return {
    nicheCode: toKnownCategoryCode(row.nicheCode),
    headline: row.headline,
    description: row.description,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    neighborhood: row.neighborhood,
    addressLine: row.addressLine,
    addressComplement: row.addressComplement,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    serviceRadiusKm: toNumber(row.serviceRadiusKm),
    serviceCities: row.serviceCities,
    serviceNeighborhoods: row.serviceNeighborhoods,
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    primaryColor: row.primaryColor,
    contactPhone: row.contactPhone,
    contactWhatsapp: row.contactWhatsapp,
    contactEmail: row.contactEmail,
    websiteUrl: row.websiteUrl,
    instagramUrl: row.instagramUrl,
    terms: row.terms,
    gallery: row.gallery,
    services: row.services,
    reviewAverage: toNumber(row.reviewAverage),
    reviewCount: row.reviewCount,
  };
}

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}
