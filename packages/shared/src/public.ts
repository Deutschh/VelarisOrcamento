import { z } from "zod";
import type { PublicCompanyReview } from "./reviews.js";

export const publicCompanyCategorySchema = z.enum([
  "cleaning_upholstery",
  "glasswork",
  "stonework",
]);

export type PublicCompanyCategoryCode = z.infer<typeof publicCompanyCategorySchema>;

export const PUBLIC_COMPANY_CATEGORIES: Array<{
  code: PublicCompanyCategoryCode;
  label: string;
  mvpPilot: boolean;
}> = [
  {
    code: "cleaning_upholstery",
    label: "Limpeza de estofados",
    mvpPilot: true,
  },
  {
    code: "glasswork",
    label: "Vidracarias",
    mvpPilot: false,
  },
  {
    code: "stonework",
    label: "Marmorarias",
    mvpPilot: false,
  },
];

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalText = (maxLength: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(1).max(maxLength).optional());

const optionalUrl = z.preprocess(emptyToUndefined, z.string().trim().url().optional());

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email().optional(),
);

const commaSeparatedTextArray = z
  .array(z.string().trim().min(1).max(120))
  .max(50)
  .default([]);

export const publicCompanySearchQuerySchema = z.object({
  category: publicCompanyCategorySchema.optional(),
  location: optionalText(120),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type PublicCompanySearchQuery = z.infer<typeof publicCompanySearchQuerySchema>;

export const profileGalleryItemSchema = z.object({
  url: z.string().trim().url(),
  alt: optionalText(120),
});

export type ProfileGalleryItem = z.infer<typeof profileGalleryItemSchema>;

export const profileServiceItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(400),
});

export type ProfileServiceItem = z.infer<typeof profileServiceItemSchema>;

export const adminCompanyPublicProfileRequestSchema = z.object({
  nicheCode: publicCompanyCategorySchema.default("cleaning_upholstery"),
  headline: optionalText(140),
  description: optionalText(2000),
  city: optionalText(120),
  state: optionalText(32),
  postalCode: optionalText(16),
  neighborhood: optionalText(120),
  addressLine: optionalText(240),
  addressComplement: optionalText(160),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  serviceRadiusKm: z.coerce.number().min(0).max(500).optional(),
  serviceCities: commaSeparatedTextArray,
  serviceNeighborhoods: commaSeparatedTextArray,
  logoUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  primaryColor: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  ),
  contactPhone: optionalText(40),
  contactWhatsapp: optionalText(40),
  contactEmail: optionalEmail,
  websiteUrl: optionalUrl,
  instagramUrl: optionalUrl,
  terms: optionalText(2000),
  gallery: z.array(profileGalleryItemSchema).max(12).default([]),
  services: z.array(profileServiceItemSchema).max(30).default([]),
});

export type AdminCompanyPublicProfileRequest = z.infer<
  typeof adminCompanyPublicProfileRequestSchema
>;

export interface CompanyPublicProfileSettings {
  nicheCode: PublicCompanyCategoryCode;
  headline: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  addressComplement: string | null;
  latitude: number | null;
  longitude: number | null;
  serviceRadiusKm: number | null;
  serviceCities: string[];
  serviceNeighborhoods: string[];
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  terms: string | null;
  gallery: ProfileGalleryItem[];
  services: ProfileServiceItem[];
  reviewAverage: number | null;
  reviewCount: number;
}

export interface PublicCompanyReviewSummary {
  average: number | null;
  count: number;
}

export interface PublicCompanySummary {
  id: string;
  tradingName: string;
  slug: string;
  nicheCode: PublicCompanyCategoryCode;
  nicheLabel: string;
  headline: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  serviceCities: string[];
  serviceRadiusKm: number | null;
  distanceKm: number | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  reviewSummary: PublicCompanyReviewSummary;
}

export interface PublicCompanyDetail extends PublicCompanySummary {
  primaryColor: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  addressComplement: string | null;
  latitude: number | null;
  longitude: number | null;
  serviceNeighborhoods: string[];
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  terms: string | null;
  gallery: ProfileGalleryItem[];
  services: ProfileServiceItem[];
  reviews: PublicCompanyReview[];
}

export interface PublicCompanyCategoriesResponse {
  categories: typeof PUBLIC_COMPANY_CATEGORIES;
}

export interface PublicCompanyListResponse {
  companies: PublicCompanySummary[];
}

export interface PublicCompanyDetailResponse {
  company: PublicCompanyDetail;
}
