import type {
  CompanyProposalSummary,
  CompanyAppointment,
  CompanyQuoteRequestEvent,
  CompanyQuoteRequestRevision,
  QuoteDraftData,
  QuoteDraftFileSummary,
  QuoteRequestStatus,
  SchedulingMode,
} from "@velaris/shared";

export interface PersistedCompanyQuoteRequest {
  id: string;
  requestCode: string | null;
  companyId: string;
  companyTimezone: string;
  companyConfigurationId: string;
  companyServiceId: string;
  companyPricingVersionId: string | null;
  status: QuoteRequestStatus;
  serviceName: string;
  serviceSchedulingMode: SchedulingMode;
  serviceEstimatedDurationMinutes: number | null;
  data: QuoteDraftData;
  files: QuoteDraftFileSummary[];
  revisions: CompanyQuoteRequestRevision[];
  events: CompanyQuoteRequestEvent[];
  proposals: CompanyProposalSummary[];
  appointments: CompanyAppointment[];
  calculationSnapshot: Record<string, unknown> | null;
  internalTotalCents: number | null;
  estimateMinCents: number | null;
  estimateMaxCents: number | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyQuoteRequestAnswerInput {
  id: string;
  itemId: string | null;
  fieldCode: string;
  value: unknown;
  originalValue: string | null;
  originalUnit: string | null;
  normalizedValue: string | null;
  normalizedUnit: "unit" | "m" | "m2" | "linear_m" | "km" | null;
  metadata: Record<string, unknown> | null;
}

export interface CompanyQuoteRequestRevisionInput {
  id: string;
  itemId: string | null;
  fieldCode: string;
  originalValue: unknown;
  revisedValue: unknown;
  reason: string | null;
  impactCents: number | null;
  configurationVersion: number;
  pricingVersion: number;
  actorUserId: string;
}

export interface StoredCompanyQuoteRequestFile {
  id: string;
  fileName: string;
  mimeType: string;
  content: Buffer | null;
}

export interface SaveCompanyQuoteRequestReviewInput {
  quoteRequestId: string;
  companyId: string;
  actorUserId: string;
  data: QuoteDraftData;
  answers: CompanyQuoteRequestAnswerInput[];
  revisions: CompanyQuoteRequestRevisionInput[];
  calculationSnapshot: Record<string, unknown>;
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  eventMetadata: Record<string, unknown>;
  now: Date;
}

export interface TransitionCompanyQuoteRequestInput {
  quoteRequestId: string;
  companyId: string;
  actorUserId: string;
  fromStatus: QuoteRequestStatus;
  toStatus: QuoteRequestStatus;
  eventType: string;
  metadata: Record<string, unknown>;
  now: Date;
}

export interface CompanyQuoteRequestRepository {
  listQuoteRequests(input: {
    companyId: string;
  }): Promise<PersistedCompanyQuoteRequest[]>;
  findQuoteRequestByCompanyAndId(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PersistedCompanyQuoteRequest | null>;
  findStoredFile(input: {
    companyId: string;
    quoteRequestId: string;
    fileId: string;
  }): Promise<StoredCompanyQuoteRequestFile | null>;
  saveReview(
    input: SaveCompanyQuoteRequestReviewInput,
  ): Promise<PersistedCompanyQuoteRequest>;
  transitionStatus(
    input: TransitionCompanyQuoteRequestInput,
  ): Promise<PersistedCompanyQuoteRequest>;
}
