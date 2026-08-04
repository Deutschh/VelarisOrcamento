import type { CompanyPublicProfileSettings, PublicCompanyReview } from "@velaris/shared";

export interface PersistedPublicCompany {
  id: string;
  tradingName: string;
  slug: string;
  profile: CompanyPublicProfileSettings;
}

export interface PublicCompanyRepository {
  listPublishedCompanies(): Promise<PersistedPublicCompany[]>;
  findPublishedCompanyBySlug(slug: string): Promise<PersistedPublicCompany | null>;
  findPublishedCompanyById(companyId: string): Promise<PersistedPublicCompany | null>;
  listVisibleReviewsByCompany(companyId: string): Promise<PublicCompanyReview[]>;
}
