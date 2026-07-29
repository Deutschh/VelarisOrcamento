import {
  PUBLIC_COMPANY_CATEGORIES,
  type CompanyPublicProfileSettings,
  type PublicCompanyCategoryCode,
} from "@velaris/shared";

export function createDefaultPublicProfile(): CompanyPublicProfileSettings {
  return {
    nicheCode: "cleaning_upholstery",
    headline: null,
    description: null,
    city: null,
    state: null,
    postalCode: null,
    neighborhood: null,
    addressLine: null,
    addressComplement: null,
    latitude: null,
    longitude: null,
    serviceRadiusKm: null,
    serviceCities: [],
    serviceNeighborhoods: [],
    logoUrl: null,
    coverImageUrl: null,
    primaryColor: null,
    contactPhone: null,
    contactWhatsapp: null,
    contactEmail: null,
    websiteUrl: null,
    instagramUrl: null,
    terms: null,
    gallery: [],
    services: [],
    reviewAverage: null,
    reviewCount: 0,
  };
}

export function getCategoryLabel(code: PublicCompanyCategoryCode) {
  return (
    PUBLIC_COMPANY_CATEGORIES.find((category) => category.code === code)?.label ??
    "Servico"
  );
}

export function toKnownCategoryCode(value: string): PublicCompanyCategoryCode {
  if (value === "cleaning_upholstery" || value === "glasswork" || value === "stonework") {
    return value;
  }

  return "cleaning_upholstery";
}
