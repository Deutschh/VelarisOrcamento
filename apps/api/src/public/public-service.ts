import { calculateDistanceKm } from "@velaris/domain";
import {
  PUBLIC_COMPANY_CATEGORIES,
  type PublicCompanyDetail,
  type PublicCompanySearchQuery,
  type PublicCompanySummary,
} from "@velaris/shared";
import { PublicCompanyNotFoundError } from "./public-errors.js";
import { getCategoryLabel } from "./public-profile.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";

export class PublicCompanyService {
  constructor(private readonly repository: PublicCompanyRepository) {}

  listCategories() {
    return PUBLIC_COMPANY_CATEGORIES;
  }

  async listCompanies(query: PublicCompanySearchQuery): Promise<PublicCompanySummary[]> {
    const companies = await this.repository.listPublishedCompanies();
    const results = companies
      .filter((company) => matchesCategory(company, query))
      .map((company) => ({
        company,
        distanceKm: calculateQueryDistance(company, query),
      }))
      .filter(({ company, distanceKm }) => matchesServiceArea(company, query, distanceKm))
      .map(({ company, distanceKm }) => toCompanySummary(company, distanceKm));

    return results.sort((left, right) => {
      if (left.distanceKm !== null && right.distanceKm !== null) {
        return left.distanceKm - right.distanceKm;
      }

      if (left.distanceKm !== null) {
        return -1;
      }

      if (right.distanceKm !== null) {
        return 1;
      }

      return left.tradingName.localeCompare(right.tradingName, "pt-BR");
    });
  }

  async getCompanyBySlug(slug: string): Promise<PublicCompanyDetail> {
    const company = await this.repository.findPublishedCompanyBySlug(slug);

    if (!company) {
      throw new PublicCompanyNotFoundError();
    }

    return toCompanyDetail(company, null);
  }

  async listCompanyServices(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    return company.services;
  }
}

function matchesCategory(
  company: PersistedPublicCompany,
  query: PublicCompanySearchQuery,
) {
  return !query.category || company.profile.nicheCode === query.category;
}

function calculateQueryDistance(
  company: PersistedPublicCompany,
  query: PublicCompanySearchQuery,
) {
  if (
    query.latitude === undefined ||
    query.longitude === undefined ||
    company.profile.latitude === null ||
    company.profile.longitude === null
  ) {
    return null;
  }

  return roundDistance(
    calculateDistanceKm(
      { latitude: query.latitude, longitude: query.longitude },
      {
        latitude: company.profile.latitude,
        longitude: company.profile.longitude,
      },
    ),
  );
}

function matchesServiceArea(
  company: PersistedPublicCompany,
  query: PublicCompanySearchQuery,
  distanceKm: number | null,
) {
  if (distanceKm !== null) {
    return (
      company.profile.serviceRadiusKm !== null &&
      distanceKm <= company.profile.serviceRadiusKm
    );
  }

  if (!query.location) {
    return true;
  }

  const location = normalizeSearchText(query.location);
  const candidates = [
    company.profile.city,
    company.profile.state,
    company.profile.postalCode,
    company.profile.neighborhood,
    ...company.profile.serviceCities,
    ...company.profile.serviceNeighborhoods,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeSearchText);

  return candidates.some(
    (candidate) => candidate.includes(location) || location.includes(candidate),
  );
}

function toCompanySummary(
  company: PersistedPublicCompany,
  distanceKm: number | null,
): PublicCompanySummary {
  return {
    id: company.id,
    tradingName: company.tradingName,
    slug: company.slug,
    nicheCode: company.profile.nicheCode,
    nicheLabel: getCategoryLabel(company.profile.nicheCode),
    headline: company.profile.headline,
    description: company.profile.description,
    city: company.profile.city,
    state: company.profile.state,
    serviceCities: company.profile.serviceCities,
    serviceRadiusKm: company.profile.serviceRadiusKm,
    distanceKm,
    logoUrl: company.profile.logoUrl,
    coverImageUrl: company.profile.coverImageUrl,
    reviewSummary: {
      average: company.profile.reviewAverage,
      count: company.profile.reviewCount,
    },
  };
}

function toCompanyDetail(
  company: PersistedPublicCompany,
  distanceKm: number | null,
): PublicCompanyDetail {
  return {
    ...toCompanySummary(company, distanceKm),
    primaryColor: company.profile.primaryColor,
    postalCode: company.profile.postalCode,
    neighborhood: company.profile.neighborhood,
    addressLine: company.profile.addressLine,
    addressComplement: company.profile.addressComplement,
    latitude: company.profile.latitude,
    longitude: company.profile.longitude,
    serviceNeighborhoods: company.profile.serviceNeighborhoods,
    contactPhone: company.profile.contactPhone,
    contactWhatsapp: company.profile.contactWhatsapp,
    contactEmail: company.profile.contactEmail,
    websiteUrl: company.profile.websiteUrl,
    instagramUrl: company.profile.instagramUrl,
    terms: company.profile.terms,
    gallery: company.profile.gallery,
    services: company.profile.services,
  };
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10;
}
