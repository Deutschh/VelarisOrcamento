import { z } from "zod";
import { publicCompanyCategorySchema } from "./public.js";
import type { PublicCompanyCategoryCode } from "./public.js";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalIsoDate = z.preprocess(
  emptyToUndefined,
  z.string().datetime({ offset: true }).optional(),
);

const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());

const optionalText = (maxLength: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(1).max(maxLength).optional());

const metricsPeriodQueryBaseSchema = z.object({
  periodStart: optionalIsoDate,
  periodEnd: optionalIsoDate,
});

function validateMetricsPeriod(
  value: z.infer<typeof metricsPeriodQueryBaseSchema>,
  context: z.RefinementCtx,
) {
  if (
    value.periodStart &&
    value.periodEnd &&
    new Date(value.periodStart).getTime() > new Date(value.periodEnd).getTime()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "periodStart must be before periodEnd.",
      path: ["periodStart"],
    });
  }
}

export const metricsPeriodQuerySchema =
  metricsPeriodQueryBaseSchema.superRefine(validateMetricsPeriod);

export type MetricsPeriodQuery = z.infer<typeof metricsPeriodQuerySchema>;

export const adminMetricsQuerySchema = metricsPeriodQueryBaseSchema
  .extend({
    companyId: optionalUuid,
    nicheCode: z.preprocess(emptyToUndefined, publicCompanyCategorySchema.optional()),
  })
  .superRefine(validateMetricsPeriod);

export type AdminMetricsQuery = z.infer<typeof adminMetricsQuerySchema>;

export const adminAuditLogQuerySchema = metricsPeriodQueryBaseSchema
  .extend({
    companyId: optionalUuid,
    action: optionalText(160),
  })
  .superRefine(validateMetricsPeriod);

export type AdminAuditLogQuery = z.infer<typeof adminAuditLogQuerySchema>;

export const priceChangeRequestStatusSchema = z.enum([
  "open",
  "under_review",
  "approved",
  "rejected",
  "implemented",
]);

export type PriceChangeRequestStatus = z.infer<typeof priceChangeRequestStatusSchema>;

export const companyPriceChangeRequestCreateSchema = z.object({
  serviceId: optionalUuid,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
});

export type CompanyPriceChangeRequestCreate = z.infer<
  typeof companyPriceChangeRequestCreateSchema
>;

export const adminPriceChangeRequestListQuerySchema = z.object({
  companyId: optionalUuid,
  status: z.preprocess(emptyToUndefined, priceChangeRequestStatusSchema.optional()),
});

export type AdminPriceChangeRequestListQuery = z.infer<
  typeof adminPriceChangeRequestListQuerySchema
>;

export const adminPriceChangeRequestResolveSchema = z.object({
  status: z.enum(["under_review", "approved", "rejected", "implemented"]),
  resolutionNote: optionalText(2000),
});

export type AdminPriceChangeRequestResolve = z.infer<
  typeof adminPriceChangeRequestResolveSchema
>;

export interface MetricsPeriodSummary {
  periodStart: string | null;
  periodEnd: string | null;
}

export interface MetricsCompanySummary {
  id: string;
  tradingName: string;
  slug: string;
  nicheCode: PublicCompanyCategoryCode;
  nicheLabel: string;
}

export interface OperationalMetricsTotals {
  requestsReceived: number;
  requestsUnderReview: number;
  requestsDeclined: number;
  proposalsSent: number;
  proposalsViewed: number;
  proposalsAccepted: number;
  conversionRateBps: number;
  estimatedValueCents: number;
  proposedValueCents: number;
  acceptedValueCents: number;
  averageResponseMinutes: number | null;
  servicesRealized: number;
  reviewsCount: number;
  reviewAverage: number | null;
}

export interface OperationalAuditLogSummary {
  id: string;
  company: MetricsCompanySummary | null;
  action: string;
  entityType: string;
  entityId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PriceChangeRequestSummary {
  id: string;
  company: MetricsCompanySummary;
  serviceId: string | null;
  serviceName: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  status: PriceChangeRequestStatus;
  title: string;
  description: string;
  resolutionNote: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyOperationalMetricsResponse {
  period: MetricsPeriodSummary;
  totals: OperationalMetricsTotals;
  priceChangeRequests: PriceChangeRequestSummary[];
  recentAuditLogs: OperationalAuditLogSummary[];
}

export interface AdminCompanyRequestMetric {
  company: MetricsCompanySummary;
  requestsReceived: number;
}

export interface AdminNicheMetric {
  nicheCode: PublicCompanyCategoryCode;
  nicheLabel: string;
  requestsReceived: number;
  proposalsSent: number;
  proposalsAccepted: number;
  conversionRateBps: number;
}

export interface AdminCompanyRankingMetric {
  company: MetricsCompanySummary;
  requestsReceived: number;
  proposalsSent: number;
  proposalsAccepted: number;
  acceptedValueCents: number;
  conversionRateBps: number;
  averageResponseMinutes: number | null;
}

export interface AdminOperationalMetricsResponse {
  period: MetricsPeriodSummary;
  companies: {
    pending: number;
    active: number;
    suspended: number;
  };
  totals: OperationalMetricsTotals;
  requestsByCompany: AdminCompanyRequestMetric[];
  requestsByNiche: AdminNicheMetric[];
  conversionByNiche: AdminNicheMetric[];
  ranking: AdminCompanyRankingMetric[];
  storageUsageBytes: number;
  priceChangeRequests: {
    open: number;
    underReview: number;
    approved: number;
    rejected: number;
    implemented: number;
  };
}

export interface CompanyPriceChangeRequestListResponse {
  priceChangeRequests: PriceChangeRequestSummary[];
}

export interface CompanyPriceChangeRequestCreateResponse {
  priceChangeRequest: PriceChangeRequestSummary;
}

export interface AdminPriceChangeRequestListResponse {
  priceChangeRequests: PriceChangeRequestSummary[];
}

export interface AdminPriceChangeRequestResolveResponse {
  priceChangeRequest: PriceChangeRequestSummary;
}

export interface AdminAuditLogListResponse {
  auditLogs: OperationalAuditLogSummary[];
}
