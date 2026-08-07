import type {
  CompanyAppointment,
  CompanyProposalSummary,
  PublicCompanyReview,
  PublicProposalDetail,
  QuoteDraftFileSummary,
  QuoteSubmitResponse,
} from "@velaris/shared";
import type {
  AddDraftFileInput,
  CreateNotificationInput,
  CreateDraftRecordInput,
  CreateRecoveryCodeInput,
  IdempotencyRecord,
  PersistedQuoteRequest,
  PublicQuoteRequestRepository,
  RecoveryCodeRecord,
  ReplacePublicTokenAfterRecoveryInput,
  SaveCalculationInput,
  SubmitDraftInput,
  UpdateDraftRecordInput,
  AcceptProposalInput,
  CreateReviewInput,
  ProposalActionIdempotencyRecord,
  RejectProposalInput,
  ReviewIdempotencyRecord,
  StoredQuoteRequestFile,
} from "../public/quote-request-repository.js";

export class InMemoryQuoteRequestRepository implements PublicQuoteRequestRepository {
  readonly requests = new Map<string, PersistedQuoteRequest>();
  readonly idempotencyRecords = new Map<string, IdempotencyRecord>();
  readonly publicTokens = new Map<
    string,
    {
      id: string;
      tokenHash: string;
      quoteRequestId: string;
      expiresAt: string | null;
      revokedAt: string | null;
    }
  >();
  readonly recoveryCodes = new Map<string, RecoveryCodeRecord>();
  readonly notifications = new Map<string, CreateNotificationInput>();
  readonly proposals = new Map<string, CompanyProposalSummary[]>();
  readonly appointments = new Map<string, CompanyAppointment[]>();
  readonly publicProposals = new Map<string, PublicProposalDetail>();
  readonly proposalActionIdempotencyRecords = new Map<
    string,
    ProposalActionIdempotencyRecord
  >();
  readonly reviews = new Map<string, PublicCompanyReview>();
  readonly reviewIdempotencyRecords = new Map<string, ReviewIdempotencyRecord>();
  readonly fileContents = new Map<string, StoredQuoteRequestFile>();

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

  async findByPublicTokenHash(input: {
    publicTokenHash: string;
    now: Date;
  }): Promise<PersistedQuoteRequest | null> {
    const token = this.publicTokens.get(input.publicTokenHash);

    if (
      !token ||
      token.revokedAt ||
      (token.expiresAt && new Date(token.expiresAt).getTime() <= input.now.getTime())
    ) {
      return null;
    }

    const request = this.requests.get(token.quoteRequestId);
    return request && request.status !== "draft" ? request : null;
  }

  async findSubmittedByRequestCode(
    requestCode: string,
  ): Promise<PersistedQuoteRequest | null> {
    return (
      Array.from(this.requests.values()).find(
        (request) => request.requestCode === requestCode && request.status !== "draft",
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
      storageProvider: "database",
      createdAt: input.now.toISOString(),
    };

    this.requests.set(request.id, {
      ...request,
      files: [...request.files, file],
    });
    this.fileContents.set(file.id, {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      content: input.content,
    });

    return file;
  }

  async findStoredFile(input: {
    quoteRequestId: string;
    fileId: string;
  }): Promise<StoredQuoteRequestFile | null> {
    const request = this.requests.get(input.quoteRequestId);
    return request?.files.some((file) => file.id === input.fileId)
      ? (this.fileContents.get(input.fileId) ?? null)
      : null;
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
    this.fileContents.delete(input.fileId);

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

  async listProposalSummaries(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyProposalSummary[]> {
    return (this.proposals.get(input.quoteRequestId) ?? []).filter(
      (proposal) => proposal.companyId === input.companyId,
    );
  }

  async findLatestPublicProposal(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PublicProposalDetail | null> {
    const proposal = this.publicProposals.get(input.quoteRequestId);

    return proposal?.companyId === input.companyId ? proposal : null;
  }

  async findProposalActionIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ProposalActionIdempotencyRecord | null> {
    return (
      this.proposalActionIdempotencyRecords.get(idempotencyKey(input.scope, input.key)) ??
      null
    );
  }

  async findReviewIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ReviewIdempotencyRecord | null> {
    return (
      this.reviewIdempotencyRecords.get(idempotencyKey(input.scope, input.key)) ?? null
    );
  }

  async findReviewByAppointmentId(
    appointmentId: string,
  ): Promise<PublicCompanyReview | null> {
    return (
      Array.from(this.reviews.values()).find(
        (review) => review.appointmentId === appointmentId,
      ) ?? null
    );
  }

  async createReview(input: CreateReviewInput): Promise<PublicCompanyReview> {
    const review: PublicCompanyReview = {
      id: input.id,
      companyId: input.companyId,
      quoteRequestId: input.quoteRequestId,
      appointmentId: input.appointmentId,
      requestCode: input.requestCode,
      serviceName: input.serviceName,
      customerName: input.customerName,
      rating: input.rating,
      comment: input.comment,
      createdAt: input.now.toISOString(),
    };

    this.reviews.set(review.id, review);
    this.reviewIdempotencyRecords.set(
      idempotencyKey(input.idempotency.scope, input.idempotency.key),
      {
        ...input.idempotency,
        expiresAt: input.idempotency.expiresAt.toISOString(),
      },
    );

    return review;
  }

  async acceptProposal(input: AcceptProposalInput): Promise<PublicProposalDetail> {
    const current = this.mustFindPublicProposal(input.quoteRequestId, input.companyId);
    const latestVersion = current.latestVersion;

    if (
      !latestVersion ||
      latestVersion.id !== input.quoteVersionId ||
      latestVersion.status !== input.fromStatus
    ) {
      throw new Error("Proposal version could not be accepted.");
    }

    const nextVersion = {
      ...latestVersion,
      status: input.toStatus,
      acceptedAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };

    const next: PublicProposalDetail = {
      ...current,
      status: input.quoteStatus,
      latestVersionStatus: input.toStatus,
      acceptedQuoteVersionId: input.quoteVersionId,
      finalTotalCents: input.finalTotalCents,
      validUntil: nextVersion.validUntil,
      latestVersion: nextVersion,
      acceptance: {
        id: input.id,
        quoteId: input.quoteId,
        quoteVersionId: input.quoteVersionId,
        quoteRequestId: input.quoteRequestId,
        companyId: input.companyId,
        requestCode: input.requestCode,
        proposalCode: input.proposalCode,
        finalTotalCents: input.finalTotalCents,
        termsVersion: input.termsVersion,
        privacyPolicyVersion: input.privacyPolicyVersion,
        estimateDisclaimerVersion: input.estimateDisclaimerVersion,
        companyTermsVersion: input.companyTermsVersion,
        acceptedAt: input.now.toISOString(),
      },
      updatedAt: input.now.toISOString(),
    };

    this.publicProposals.set(input.quoteRequestId, next);
    this.proposals.set(input.quoteRequestId, [
      next,
      ...(this.proposals.get(input.quoteRequestId) ?? []).filter(
        (proposal) => proposal.id !== next.id,
      ),
    ]);
    this.proposalActionIdempotencyRecords.set(
      idempotencyKey(input.idempotency.scope, input.idempotency.key),
      {
        ...input.idempotency,
        expiresAt: input.idempotency.expiresAt.toISOString(),
      },
    );

    return next;
  }

  async rejectProposal(input: RejectProposalInput): Promise<PublicProposalDetail> {
    const current = this.mustFindPublicProposal(input.quoteRequestId, input.companyId);
    const latestVersion = current.latestVersion;

    if (
      !latestVersion ||
      latestVersion.id !== input.quoteVersionId ||
      latestVersion.status !== input.fromStatus
    ) {
      throw new Error("Proposal version could not be rejected.");
    }

    const nextVersion = {
      ...latestVersion,
      status: input.toStatus,
      rejectedAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };

    const next: PublicProposalDetail = {
      ...current,
      status: input.quoteStatus,
      latestVersionStatus: input.toStatus,
      latestVersion: nextVersion,
      updatedAt: input.now.toISOString(),
    };

    this.publicProposals.set(input.quoteRequestId, next);
    this.proposals.set(input.quoteRequestId, [
      next,
      ...(this.proposals.get(input.quoteRequestId) ?? []).filter(
        (proposal) => proposal.id !== next.id,
      ),
    ]);
    this.proposalActionIdempotencyRecords.set(
      idempotencyKey(input.idempotency.scope, input.idempotency.key),
      {
        ...input.idempotency,
        expiresAt: input.idempotency.expiresAt.toISOString(),
      },
    );

    return next;
  }

  async listAppointments(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyAppointment[]> {
    return (this.appointments.get(input.quoteRequestId) ?? []).filter(
      (appointment) => appointment.companyId === input.companyId,
    );
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
    this.publicTokens.set(input.publicTokenHash, {
      id: input.publicTokenId,
      tokenHash: input.publicTokenHash,
      quoteRequestId: request.id,
      expiresAt: input.publicTokenExpiresAt?.toISOString() ?? null,
      revokedAt: null,
    });
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

  async createRecoveryCode(input: CreateRecoveryCodeInput): Promise<RecoveryCodeRecord> {
    const recoveryCode: RecoveryCodeRecord = {
      id: input.id,
      quoteRequestId: input.quoteRequestId,
      requestCode: input.requestCode,
      contactType: input.contactType,
      contactHash: input.contactHash,
      tokenHash: input.tokenHash,
      otpHash: input.otpHash,
      attempts: 0,
      maxAttempts: input.maxAttempts,
      expiresAt: input.expiresAt.toISOString(),
      usedAt: null,
      revokedAt: null,
      metadata: input.metadata,
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };

    this.recoveryCodes.set(recoveryCode.tokenHash, recoveryCode);
    return recoveryCode;
  }

  async findRecoveryCodeByTokenHash(
    tokenHash: string,
  ): Promise<RecoveryCodeRecord | null> {
    return this.recoveryCodes.get(tokenHash) ?? null;
  }

  async recordRecoveryAttempt(input: {
    recoveryCodeId: string;
    attempts: number;
    revokedAt: Date | null;
    now: Date;
  }): Promise<void> {
    const current = Array.from(this.recoveryCodes.values()).find(
      (recoveryCode) => recoveryCode.id === input.recoveryCodeId,
    );

    if (!current) {
      return;
    }

    this.recoveryCodes.set(current.tokenHash, {
      ...current,
      attempts: input.attempts,
      revokedAt: input.revokedAt?.toISOString() ?? current.revokedAt,
      updatedAt: input.now.toISOString(),
    });
  }

  async replacePublicTokenAfterRecovery(
    input: ReplacePublicTokenAfterRecoveryInput,
  ): Promise<void> {
    const request = this.mustFind(input.quoteRequestId);

    for (const [key, token] of this.publicTokens.entries()) {
      if (token.id === input.previousPublicTokenId) {
        this.publicTokens.set(key, {
          ...token,
          revokedAt: input.now.toISOString(),
        });
      }
    }

    this.publicTokens.set(input.newPublicTokenHash, {
      id: input.newPublicTokenId,
      tokenHash: input.newPublicTokenHash,
      quoteRequestId: input.quoteRequestId,
      expiresAt: input.newPublicTokenExpiresAt?.toISOString() ?? null,
      revokedAt: null,
    });

    this.requests.set(request.id, {
      ...request,
      publicTokenId: input.newPublicTokenId,
      updatedAt: input.now.toISOString(),
    });

    const current = Array.from(this.recoveryCodes.values()).find(
      (recoveryCode) => recoveryCode.id === input.recoveryCodeId,
    );

    if (current) {
      this.recoveryCodes.set(current.tokenHash, {
        ...current,
        usedAt: input.now.toISOString(),
        updatedAt: input.now.toISOString(),
      });
    }
  }

  async createNotification(input: CreateNotificationInput): Promise<void> {
    this.notifications.set(input.id, input);
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

  private mustFindPublicProposal(
    quoteRequestId: string,
    companyId: string,
  ): PublicProposalDetail {
    const proposal = this.publicProposals.get(quoteRequestId);

    if (!proposal || proposal.companyId !== companyId) {
      throw new Error(`Missing public proposal for quote request ${quoteRequestId}.`);
    }

    return proposal;
  }
}

function idempotencyKey(scope: string, key: string) {
  return `${scope}:${key}`;
}
