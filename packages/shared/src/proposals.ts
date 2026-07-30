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
