import type {
  QuoteDraftData,
  QuoteDraftFileSummary,
  QuoteRequestStatus,
  QuoteSubmitResponse,
} from "@velaris/shared";

export interface PersistedQuoteRequest {
  id: string;
  requestCode: string | null;
  companyId: string;
  companyConfigurationId: string;
  companyServiceId: string;
  companyPricingVersionId: string | null;
  customerId: string | null;
  status: QuoteRequestStatus;
  draftTokenHash: string | null;
  publicTokenId: string | null;
  data: QuoteDraftData;
  configurationSnapshot: Record<string, unknown> | null;
  legalSnapshot: Record<string, unknown> | null;
  calculationSnapshot: Record<string, unknown> | null;
  internalTotalCents: number | null;
  estimateMinCents: number | null;
  estimateMaxCents: number | null;
  submittedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  files: QuoteDraftFileSummary[];
}

export interface QuoteRequestAnswerInput {
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

export interface CreateDraftRecordInput {
  id: string;
  companyId: string;
  companyConfigurationId: string;
  companyServiceId: string;
  companyPricingVersionId: string | null;
  draftTokenHash: string;
  data: QuoteDraftData;
  expiresAt: Date;
  now: Date;
  answers: QuoteRequestAnswerInput[];
}

export interface UpdateDraftRecordInput {
  quoteRequestId: string;
  data: QuoteDraftData;
  now: Date;
  answers: QuoteRequestAnswerInput[];
}

export interface AddDraftFileInput {
  id: string;
  quoteRequestId: string;
  itemId: string | null;
  fieldCode: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  now: Date;
}

export interface SaveCalculationInput {
  id: string;
  quoteRequestId: string;
  calculationSnapshot: Record<string, unknown>;
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  now: Date;
}

export interface IdempotencyRecord {
  id: string;
  scope: string;
  key: string;
  requestHash: string;
  responseBody: QuoteSubmitResponse;
  statusCode: number;
  expiresAt: string;
}

export interface SubmitDraftInput extends SaveCalculationInput {
  requestCode: string;
  submittedAt: Date;
  publicTokenId: string;
  publicTokenHash: string;
  publicTokenExpiresAt: Date | null;
  configurationSnapshot: Record<string, unknown>;
  legalSnapshot: Record<string, unknown>;
  idempotency: {
    id: string;
    scope: string;
    key: string;
    requestHash: string;
    responseBody: QuoteSubmitResponse;
    statusCode: number;
    expiresAt: Date;
  };
}

export interface PublicQuoteRequestRepository {
  createDraft(input: CreateDraftRecordInput): Promise<PersistedQuoteRequest>;
  findByDraftTokenHash(draftTokenHash: string): Promise<PersistedQuoteRequest | null>;
  updateDraft(input: UpdateDraftRecordInput): Promise<PersistedQuoteRequest>;
  addDraftFile(input: AddDraftFileInput): Promise<QuoteDraftFileSummary>;
  deleteDraftFile(input: { quoteRequestId: string; fileId: string }): Promise<boolean>;
  saveCalculation(input: SaveCalculationInput): Promise<PersistedQuoteRequest>;
  findIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<IdempotencyRecord | null>;
  submitDraft(input: SubmitDraftInput): Promise<PersistedQuoteRequest>;
  deleteExpiredDrafts(now: Date): Promise<number>;
}
