import type {
  CompanyAppointment,
  CompanyProposalSummary,
  PublicProposalAcceptance,
  PublicProposalDetail,
  PublicProposalVersion,
  QuoteDraftData,
  QuoteDraftFileSummary,
  QuoteRequestStatus,
  QuoteSubmitResponse,
  QuoteStatus,
  QuoteVersionStatus,
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

export interface RecoveryCodeRecord {
  id: string;
  quoteRequestId: string;
  requestCode: string;
  contactType: "email" | "whatsapp";
  contactHash: string;
  tokenHash: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
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

export interface CreateRecoveryCodeInput {
  id: string;
  quoteRequestId: string;
  requestCode: string;
  contactType: "email" | "whatsapp";
  contactHash: string;
  tokenHash: string;
  otpHash: string;
  maxAttempts: number;
  expiresAt: Date;
  metadata: Record<string, unknown>;
  now: Date;
}

export interface ReplacePublicTokenAfterRecoveryInput {
  quoteRequestId: string;
  requestCode: string;
  previousPublicTokenId: string | null;
  recoveryCodeId: string;
  newPublicTokenId: string;
  newPublicTokenHash: string;
  newPublicTokenExpiresAt: Date | null;
  now: Date;
}

export interface CreateNotificationInput {
  id: string;
  companyId: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  now: Date;
}

export interface ProposalActionIdempotencyRecord {
  id: string;
  scope: string;
  key: string;
  requestHash: string;
  responseBody: {
    quoteId: string;
    quoteVersionId: string;
  };
  statusCode: number;
  expiresAt: string;
}

export interface AcceptProposalInput {
  id: string;
  quoteId: string;
  quoteVersionId: string;
  quoteRequestId: string;
  companyId: string;
  requestCode: string;
  proposalCode: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string | null;
  finalTotalCents: number;
  termsVersion: string;
  privacyPolicyVersion: string;
  estimateDisclaimerVersion: string;
  companyTermsVersion: string | null;
  legalSnapshot: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  fromStatus: QuoteVersionStatus;
  toStatus: QuoteVersionStatus;
  quoteStatus: QuoteStatus;
  now: Date;
  idempotency: {
    id: string;
    scope: string;
    key: string;
    requestHash: string;
    responseBody: {
      quoteId: string;
      quoteVersionId: string;
    };
    statusCode: number;
    expiresAt: Date;
  };
}

export interface RejectProposalInput {
  quoteId: string;
  quoteVersionId: string;
  quoteRequestId: string;
  companyId: string;
  fromStatus: QuoteVersionStatus;
  toStatus: QuoteVersionStatus;
  quoteStatus: QuoteStatus;
  reasonCode: string;
  reason: string | null;
  now: Date;
  idempotency: {
    id: string;
    scope: string;
    key: string;
    requestHash: string;
    responseBody: {
      quoteId: string;
      quoteVersionId: string;
    };
    statusCode: number;
    expiresAt: Date;
  };
}

export interface PublicQuoteRequestRepository {
  createDraft(input: CreateDraftRecordInput): Promise<PersistedQuoteRequest>;
  findByDraftTokenHash(draftTokenHash: string): Promise<PersistedQuoteRequest | null>;
  findByPublicTokenHash(input: {
    publicTokenHash: string;
    now: Date;
  }): Promise<PersistedQuoteRequest | null>;
  findSubmittedByRequestCode(requestCode: string): Promise<PersistedQuoteRequest | null>;
  updateDraft(input: UpdateDraftRecordInput): Promise<PersistedQuoteRequest>;
  addDraftFile(input: AddDraftFileInput): Promise<QuoteDraftFileSummary>;
  deleteDraftFile(input: { quoteRequestId: string; fileId: string }): Promise<boolean>;
  saveCalculation(input: SaveCalculationInput): Promise<PersistedQuoteRequest>;
  listProposalSummaries(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyProposalSummary[]>;
  findLatestPublicProposal(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PublicProposalDetail | null>;

  findProposalActionIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ProposalActionIdempotencyRecord | null>;

  acceptProposal(input: AcceptProposalInput): Promise<PublicProposalDetail>;

  rejectProposal(input: RejectProposalInput): Promise<PublicProposalDetail>;
  listAppointments(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyAppointment[]>;
  findIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<IdempotencyRecord | null>;
  submitDraft(input: SubmitDraftInput): Promise<PersistedQuoteRequest>;
  createRecoveryCode(input: CreateRecoveryCodeInput): Promise<RecoveryCodeRecord>;
  findRecoveryCodeByTokenHash(tokenHash: string): Promise<RecoveryCodeRecord | null>;
  recordRecoveryAttempt(input: {
    recoveryCodeId: string;
    attempts: number;
    revokedAt: Date | null;
    now: Date;
  }): Promise<void>;
  replacePublicTokenAfterRecovery(
    input: ReplacePublicTokenAfterRecoveryInput,
  ): Promise<void>;
  createNotification(input: CreateNotificationInput): Promise<void>;
  deleteExpiredDrafts(now: Date): Promise<number>;
}
