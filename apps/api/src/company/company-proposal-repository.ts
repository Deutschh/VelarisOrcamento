import type {
  CompanyProposalDetail,
  CompanyProposalEvent,
  CompanyProposalItem,
  CompanyProposalVersion,
  QuoteStatus,
  QuoteVersionStatus,
} from "@velaris/shared";

export type PersistedCompanyProposal = CompanyProposalDetail;
export type PersistedCompanyProposalVersion = CompanyProposalVersion;
export type PersistedCompanyProposalItem = CompanyProposalItem;
export type PersistedCompanyProposalEvent = CompanyProposalEvent;

export interface ProposalVersionItemInput {
  id: string;
  itemId: string | null;
  label: string;
  quantity: number;
  internalTotalCents: number;
  finalTotalCents: number;
  snapshot: Record<string, unknown>;
  displayOrder: number;
}

export interface CreateProposalVersionInput {
  quoteId: string;
  quoteRequestId: string;
  companyId: string;
  actorUserId: string;
  versionId: string;
  versionNumber: number;
  proposalCode: string;
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  finalTotalCents: number;
  outOfRangeReason: string | null;
  validUntil: Date;
  terms: string | null;
  termsVersion: string;
  snapshot: Record<string, unknown>;
  items: ProposalVersionItemInput[];
  now: Date;
  hasExistingQuote: boolean;
}

export interface ProposalSendIdempotencyRecord {
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

export interface SendProposalVersionInput {
  quoteId: string;
  quoteVersionId: string;
  companyId: string;
  actorUserId: string;
  fromStatus: QuoteVersionStatus;
  toStatus: QuoteVersionStatus;
  quoteStatus: QuoteStatus;
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
  now: Date;
}

export interface CompanyProposalRepository {
  findProposalByQuoteRequest(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PersistedCompanyProposal | null>;
  findProposalByCompanyAndId(input: {
    companyId: string;
    quoteId: string;
  }): Promise<PersistedCompanyProposal | null>;
  createVersion(input: CreateProposalVersionInput): Promise<PersistedCompanyProposal>;
  findSendIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ProposalSendIdempotencyRecord | null>;
  sendVersion(input: SendProposalVersionInput): Promise<PersistedCompanyProposal>;
}
