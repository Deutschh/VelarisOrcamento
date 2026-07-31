import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const quoteStatusSchema = z.enum([
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);

export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteVersionStatusSchema = z.enum([
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "superseded",
]);

export type QuoteVersionStatus = z.infer<typeof quoteVersionStatusSchema>;

export const companyCreateProposalRequestSchema = z.object({
  finalTotalCents: z.coerce.number().int().min(0).optional(),
  outOfRangeReason: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1200).optional(),
  ),
  validUntil: z.preprocess(
    emptyToUndefined,
    z.string().datetime({ offset: true }).optional(),
  ),
  terms: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  termsVersion: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(80).optional(),
  ),
});

export type CompanyCreateProposalRequest = z.infer<
  typeof companyCreateProposalRequestSchema
>;

export const publicProposalAcceptRequestSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
  acceptedLegalTerms: z.literal(true),
});

export type PublicProposalAcceptRequest = z.infer<
  typeof publicProposalAcceptRequestSchema
>;

export const publicProposalRejectReasonCodeSchema = z.enum([
  "price",
  "deadline",
  "schedule",
  "hired_another_company",
  "gave_up",
  "other",
]);

export type PublicProposalRejectReasonCode = z.infer<
  typeof publicProposalRejectReasonCodeSchema
>;

export const publicProposalRejectRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid().optional(),
    reasonCode: publicProposalRejectReasonCodeSchema,
    reason: z.preprocess(emptyToUndefined, z.string().trim().min(3).max(800).optional()),
  })
  .superRefine((value, context) => {
    if (value.reasonCode === "other" && !value.reason?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when rejection reason is other.",
        path: ["reason"],
      });
    }
  });

export type PublicProposalRejectRequest = z.infer<
  typeof publicProposalRejectRequestSchema
>;

export interface CompanyProposalItem {
  id: string;
  quoteVersionId: string;
  itemId: string | null;
  label: string;
  quantity: number;
  internalTotalCents: number;
  finalTotalCents: number;
  snapshot: Record<string, unknown>;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProposalEvent {
  id: string;
  quoteVersionId: string;
  eventType: string;
  fromStatus: QuoteVersionStatus | null;
  toStatus: QuoteVersionStatus | null;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PublicProposalItem {
  id: string;
  quoteVersionId: string;
  itemId: string | null;
  label: string;
  quantity: number;
  finalTotalCents: number;
  snapshot: Record<string, unknown>;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProposalVersion {
  id: string;
  quoteId: string;
  quoteRequestId: string;
  companyId: string;
  versionNumber: number;
  proposalCode: string;
  status: QuoteVersionStatus;
  estimateMinCents: number;
  estimateMaxCents: number;
  finalTotalCents: number;
  outOfRangeReason: string | null;
  validUntil: string;
  terms: string | null;
  termsVersion: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  items: PublicProposalItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicProposalAcceptance {
  id: string;
  quoteId: string;
  quoteVersionId: string;
  quoteRequestId: string;
  companyId: string;
  requestCode: string;
  proposalCode: string;
  finalTotalCents: number;
  termsVersion: string;
  privacyPolicyVersion: string;
  estimateDisclaimerVersion: string;
  companyTermsVersion: string | null;
  acceptedAt: string;
}

export interface PublicProposalDetail extends CompanyProposalSummary {
  latestVersion: PublicProposalVersion | null;
  acceptance: PublicProposalAcceptance | null;
}

export interface CompanyProposalVersion {
  id: string;
  quoteId: string;
  quoteRequestId: string;
  companyId: string;
  versionNumber: number;
  proposalCode: string;
  status: QuoteVersionStatus;
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  finalTotalCents: number;
  outOfRangeReason: string | null;
  validUntil: string;
  terms: string | null;
  termsVersion: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  snapshot: Record<string, unknown>;
  items: CompanyProposalItem[];
  events: CompanyProposalEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProposalSummary {
  id: string;
  quoteRequestId: string;
  companyId: string;
  status: QuoteStatus;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  latestProposalCode: string | null;
  latestVersionStatus: QuoteVersionStatus | null;
  finalTotalCents: number | null;
  validUntil: string | null;
  sentAt: string | null;
  acceptedQuoteVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProposalDetail extends CompanyProposalSummary {
  versions: CompanyProposalVersion[];
}

export interface CompanyProposalDetailResponse {
  proposal: CompanyProposalDetail;
}
