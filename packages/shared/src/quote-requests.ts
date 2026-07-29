import { z } from "zod";
import type { CalculationLine, CalculationResult } from "./pricing.js";
import type { CompanyFieldConfiguration, SchedulingMode } from "./templates.js";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const draftText = (maxLength: number) => z.string().trim().max(maxLength).default("");

export const quoteRequestStatusSchema = z.enum(["draft", "submitted"]);

export type QuoteRequestStatus = z.infer<typeof quoteRequestStatusSchema>;

export const quoteDraftStepSchema = z.enum([
  "items",
  "details",
  "contact",
  "review",
  "submitted",
]);

export type QuoteDraftStep = z.infer<typeof quoteDraftStepSchema>;

export const quoteDraftItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: draftText(120),
  itemType: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().int().min(1).max(99),
  size: z.string().trim().min(1).max(120),
  seats: z.coerce.number().int().min(0).max(30),
  fabricType: z.string().trim().min(1).max(120),
  dirtLevel: z.string().trim().min(1).max(120),
  hasStains: z.boolean().default(false),
  stainTypes: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  odor: z.boolean().default(false),
  petHair: z.boolean().default(false),
  petsPresent: z.boolean().default(false),
  waterproofing: z.boolean().default(false),
  notes: draftText(600),
});

export type QuoteDraftItem = z.infer<typeof quoteDraftItemSchema>;

export const quoteDraftAddressSchema = z.object({
  postalCode: draftText(16),
  city: draftText(120),
  state: draftText(32),
  neighborhood: draftText(120),
  street: draftText(200),
  number: draftText(40),
  complement: draftText(160),
  reference: draftText(240),
  fullAddress: draftText(400),
});

export type QuoteDraftAddress = z.infer<typeof quoteDraftAddressSchema>;

export const quoteDraftAccessSchema = z.object({
  urgency: z.string().trim().min(1).max(120).default("normal"),
  floor: z.coerce.number().int().min(0).max(99).default(0),
  hasElevator: z.boolean().default(true),
  parking: z.boolean().default(true),
  distanceKm: z.coerce.number().min(0).max(500).default(0),
});

export type QuoteDraftAccess = z.infer<typeof quoteDraftAccessSchema>;

export const quoteDraftContactSchema = z.object({
  name: draftText(160),
  whatsapp: draftText(40),
  email: z.string().trim().email().or(z.literal("")).default(""),
});

export type QuoteDraftContact = z.infer<typeof quoteDraftContactSchema>;

export const quoteDraftDataSchema = z.object({
  currentStep: quoteDraftStepSchema.default("items"),
  items: z.array(quoteDraftItemSchema).min(1).max(30),
  address: quoteDraftAddressSchema,
  access: quoteDraftAccessSchema,
  contact: quoteDraftContactSchema,
  notes: draftText(2000),
});

export type QuoteDraftData = z.infer<typeof quoteDraftDataSchema>;

export const createQuoteDraftRequestSchema = z.object({
  companySlug: z.string().trim().min(1).max(160),
  serviceCode: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(120).optional(),
  ),
});

export type CreateQuoteDraftRequest = z.infer<typeof createQuoteDraftRequestSchema>;

export const updateQuoteDraftRequestSchema = z.object({
  currentStep: quoteDraftStepSchema.optional(),
  items: z.array(quoteDraftItemSchema).min(1).max(30).optional(),
  address: quoteDraftAddressSchema.partial().optional(),
  access: quoteDraftAccessSchema.partial().optional(),
  contact: quoteDraftContactSchema.partial().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type UpdateQuoteDraftRequest = z.infer<typeof updateQuoteDraftRequestSchema>;

export const quoteDraftFileMetadataRequestSchema = z.object({
  itemId: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
  fieldCode: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120).optional()),
  fileName: z.string().trim().min(1).max(240),
  mimeType: z
    .string()
    .trim()
    .regex(/^(image\/(jpeg|png|webp)|application\/pdf)$/),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(15 * 1024 * 1024),
});

export type QuoteDraftFileMetadataRequest = z.infer<
  typeof quoteDraftFileMetadataRequestSchema
>;

export const submitQuoteDraftRequestSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
  acceptedLegalTerms: z.literal(true),
});

export type SubmitQuoteDraftRequest = z.infer<typeof submitQuoteDraftRequestSchema>;

export interface QuoteDraftServiceSummary {
  id: string;
  code: string;
  name: string;
  schedulingMode: SchedulingMode;
  estimateMarginLowerBps: number;
  estimateMarginUpperBps: number;
  fields: CompanyFieldConfiguration[];
}

export interface QuoteDraftFileSummary {
  id: string;
  itemId: string | null;
  fieldCode: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: "stub";
  createdAt: string;
}

export interface QuoteDraftDetail {
  id: string;
  status: QuoteRequestStatus;
  companyId: string;
  companySlug: string;
  companyName: string;
  requestCode: string | null;
  service: QuoteDraftServiceSummary;
  configurationVersion: number;
  pricingVersion: number;
  expiresAt: string;
  submittedAt: string | null;
  data: QuoteDraftData;
  files: QuoteDraftFileSummary[];
  estimate: QuoteEstimateSummary | null;
}

export interface QuoteDraftResponse {
  draft: QuoteDraftDetail;
}

export interface CreateQuoteDraftResponse extends QuoteDraftResponse {
  draftToken: string;
}

export interface QuoteItemEstimateSummary {
  itemId: string;
  label: string;
  quantity: number;
  internalTotalCents: number;
  lines: CalculationLine[];
}

export interface QuoteEstimateSummary {
  currency: "BRL";
  calculatedAt: string;
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  itemEstimates: QuoteItemEstimateSummary[];
  requestAdjustments: CalculationLine[];
}

export interface QuoteEstimateResponse {
  draft: QuoteDraftDetail;
  estimate: QuoteEstimateSummary;
  calculation: CalculationResult;
}

export interface QuoteSubmitResponse {
  requestCode: string;
  trackingPath: string;
  submittedAt: string;
  estimate: QuoteEstimateSummary;
}
