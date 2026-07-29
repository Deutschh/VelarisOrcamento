import type { QuoteDraftFileSummary, QuoteSubmitResponse } from "@velaris/shared";
import type {
  AddDraftFileInput,
  CreateDraftRecordInput,
  IdempotencyRecord,
  PersistedQuoteRequest,
  PublicQuoteRequestRepository,
  SaveCalculationInput,
  SubmitDraftInput,
  UpdateDraftRecordInput,
} from "../public/quote-request-repository.js";

export class InMemoryQuoteRequestRepository implements PublicQuoteRequestRepository {
  readonly requests = new Map<string, PersistedQuoteRequest>();
  readonly idempotencyRecords = new Map<string, IdempotencyRecord>();

  async createDraft(input: CreateDraftRecordInput): Promise<PersistedQuoteRequest> {
    const request: PersistedQuoteRequest = {
      id: input.id,
      requestCode: null,
      companyId: input.companyId,
      companyConfigurationId: input.companyConfigurationId,
      companyServiceId: input.companyServiceId,
      companyPricingVersionId: input.companyPricingVersionId,
      customerId: null,
      status: "draft",
      draftTokenHash: input.draftTokenHash,
      publicTokenId: null,
      data: input.data,
      configurationSnapshot: null,
      legalSnapshot: null,
      calculationSnapshot: null,
      internalTotalCents: null,
      estimateMinCents: null,
      estimateMaxCents: null,
      submittedAt: null,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
      files: [],
    };

    this.requests.set(request.id, request);
    return request;
  }

  async findByDraftTokenHash(
    draftTokenHash: string,
  ): Promise<PersistedQuoteRequest | null> {
    return (
      Array.from(this.requests.values()).find(
        (request) => request.draftTokenHash === draftTokenHash,
      ) ?? null
    );
  }

  async updateDraft(input: UpdateDraftRecordInput): Promise<PersistedQuoteRequest> {
    const current = this.mustFind(input.quoteRequestId);
    const request = {
      ...current,
      data: input.data,
      updatedAt: input.now.toISOString(),
    };

    this.requests.set(request.id, request);
    return request;
  }

  async addDraftFile(input: AddDraftFileInput): Promise<QuoteDraftFileSummary> {
    const request = this.mustFind(input.quoteRequestId);
    const file: QuoteDraftFileSummary = {
      id: input.id,
      itemId: input.itemId,
      fieldCode: input.fieldCode,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageProvider: "stub",
      createdAt: input.now.toISOString(),
    };

    this.requests.set(request.id, {
      ...request,
      files: [...request.files, file],
    });

    return file;
  }

  async deleteDraftFile(input: {
    quoteRequestId: string;
    fileId: string;
  }): Promise<boolean> {
    const request = this.mustFind(input.quoteRequestId);
    const nextFiles = request.files.filter((file) => file.id !== input.fileId);

    this.requests.set(request.id, {
      ...request,
      files: nextFiles,
    });

    return nextFiles.length !== request.files.length;
  }

  async saveCalculation(input: SaveCalculationInput): Promise<PersistedQuoteRequest> {
    const current = this.mustFind(input.quoteRequestId);
    const request: PersistedQuoteRequest = {
      ...current,
      calculationSnapshot: input.calculationSnapshot,
      internalTotalCents: input.internalTotalCents,
      estimateMinCents: input.estimateMinCents,
      estimateMaxCents: input.estimateMaxCents,
      updatedAt: input.now.toISOString(),
    };

    this.requests.set(request.id, request);
    return request;
  }

  async findIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<IdempotencyRecord | null> {
    return this.idempotencyRecords.get(idempotencyKey(input.scope, input.key)) ?? null;
  }

  async submitDraft(input: SubmitDraftInput): Promise<PersistedQuoteRequest> {
    const current = this.mustFind(input.quoteRequestId);

    if (current.status !== "draft") {
      throw new Error("Quote request draft could not be submitted.");
    }

    const request: PersistedQuoteRequest = {
      ...current,
      requestCode: input.requestCode,
      status: "submitted",
      publicTokenId: input.publicTokenId,
      configurationSnapshot: input.configurationSnapshot,
      legalSnapshot: input.legalSnapshot,
      calculationSnapshot: input.calculationSnapshot,
      internalTotalCents: input.internalTotalCents,
      estimateMinCents: input.estimateMinCents,
      estimateMaxCents: input.estimateMaxCents,
      submittedAt: input.submittedAt.toISOString(),
      updatedAt: input.now.toISOString(),
    };

    this.requests.set(request.id, request);
    this.idempotencyRecords.set(
      idempotencyKey(input.idempotency.scope, input.idempotency.key),
      {
        id: input.idempotency.id,
        scope: input.idempotency.scope,
        key: input.idempotency.key,
        requestHash: input.idempotency.requestHash,
        responseBody: input.idempotency.responseBody as QuoteSubmitResponse,
        statusCode: input.idempotency.statusCode,
        expiresAt: input.idempotency.expiresAt.toISOString(),
      },
    );

    return request;
  }

  async deleteExpiredDrafts(now: Date): Promise<number> {
    const expired = Array.from(this.requests.values()).filter(
      (request) =>
        request.status === "draft" &&
        new Date(request.expiresAt).getTime() < now.getTime(),
    );

    for (const request of expired) {
      this.requests.delete(request.id);
    }

    return expired.length;
  }

  private mustFind(id: string) {
    const request = this.requests.get(id);

    if (!request) {
      throw new Error(`Missing quote request ${id}.`);
    }

    return request;
  }
}

function idempotencyKey(scope: string, key: string) {
  return `${scope}:${key}`;
}
