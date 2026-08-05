import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  CalculationError,
  ProposalLifecycleError,
  QuoteRequestLifecycleError,
  ServiceLifecycleError,
  assertCanCreateReview,
  assertCanAcceptProposalVersion,
  assertCanRejectProposalVersion,
  assertDraftQuoteRequest,
  calculateQuoteRequestEstimate,
  parseIdempotencyKey,
  type CalculationAnswers,
  type CalculationPricingRule,
} from "@velaris/domain";
import {
  APP_DEFAULTS,
  quoteDraftDataSchema,
  type CreateQuoteDraftRequest,
  type CreateQuoteDraftResponse,
  type CompanyAppointment,
  type CompanyProposalSummary,
  type CustomerAppointmentActionRequest,
  type QuoteDraftData,
  type QuoteDraftDetail,
  type QuoteDraftFileMetadataRequest,
  type QuoteDraftResponse,
  type QuoteEstimateResponse,
  type QuoteEstimateSummary,
  type QuoteItemEstimateSummary,
  type QuoteSubmitResponse,
  type QuoteVersionStatus,
  type SubmitQuoteDraftRequest,
  type UpdateQuoteDraftRequest,
  type CompanyConfigurationDetail,
  type CompanyServiceConfiguration,
  type PricingRuleConfiguration,
  type PublicTrackingAppointmentActionResponse,
  type PublicTrackingRecoveryRequest,
  type PublicTrackingRecoveryRequestResponse,
  type PublicTrackingRecoveryVerifyRequest,
  type PublicTrackingRecoveryVerifyResponse,
  type PublicTrackingResponse,
  type PublicProposalAcceptRequest,
  type PublicProposalDetail,
  type PublicProposalRejectRequest,
  type PublicTrackingProposalActionResponse,
  type PublicTrackingProposalDetailResponse,
  type PublicReviewCreateRequest,
  type PublicReviewCreateResponse,
} from "@velaris/shared";
import { hashToken } from "../auth/token-service.js";
import type { CompanyAppointmentService } from "../company/company-appointment-service.js";
import { env } from "../config/env.js";
import type { EmailAdapter } from "../notifications/email-adapter.js";
import type { TemplateRepository } from "../templates/template-repository.js";
import {
  PublicCompanyNotFoundError,
  PublicQuoteCalculationError,
  PublicQuoteConfigurationUnavailableError,
  PublicQuoteDraftExpiredError,
  PublicQuoteDraftNotEditableError,
  PublicQuoteDraftNotFoundError,
  PublicQuoteIdempotencyConflictError,
  PublicQuoteIdempotencyRequiredError,
  PublicQuoteSubmissionValidationError,
  PublicRecoveryAttemptsExceededError,
  PublicRecoveryEmailRequiredError,
  PublicRecoveryInvalidError,
  PublicRecoveryOtpExpiredError,
  PublicRecoveryOtpInvalidError,
  PublicTrackingAppointmentUnavailableError,
  PublicTrackingTokenInvalidError,
  PublicProposalAlreadyDecidedError,
  PublicProposalExpiredError,
  PublicProposalIdempotencyConflictError,
  PublicProposalIdempotencyRequiredError,
  PublicProposalUnavailableError,
  PublicReviewIdempotencyConflictError,
  PublicReviewIdempotencyRequiredError,
  PublicReviewNotEligibleError,
} from "./public-errors.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";
import type {
  PersistedQuoteRequest,
  PublicQuoteRequestRepository,
  QuoteRequestAnswerInput,
} from "./quote-request-repository.js";
import { createPublicProposalPdf, type GeneratedProposalPdf } from "./proposal-pdf.js";

interface PublicQuoteRequestServiceDependencies {
  publicCompanyRepository: PublicCompanyRepository;
  templateRepository: TemplateRepository;
  quoteRequestRepository: PublicQuoteRequestRepository;
  companyAppointmentService?: CompanyAppointmentService;
  emailAdapter?: EmailAdapter;
  draftExpirationDays?: number;
  recoveryOtpTtlMinutes?: number;
  recoveryMaxAttempts?: number;
  now?: () => Date;
}

interface DraftContext {
  company: PersistedPublicCompany;
  configuration: CompanyConfigurationDetail;
  request: PersistedQuoteRequest;
  service: CompanyServiceConfiguration;
}

interface TrackingContext {
  company: PersistedPublicCompany;
  configuration: CompanyConfigurationDetail;
  request: PersistedQuoteRequest;
  service: CompanyServiceConfiguration;
}

interface RequestMetadata {
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class PublicQuoteRequestService {
  constructor(private readonly dependencies: PublicQuoteRequestServiceDependencies) {}

  async createDraft(input: CreateQuoteDraftRequest): Promise<CreateQuoteDraftResponse> {
    const now = this.now();
    await this.dependencies.quoteRequestRepository.deleteExpiredDrafts(now);

    const company =
      await this.dependencies.publicCompanyRepository.findPublishedCompanyBySlug(
        input.companySlug,
      );

    if (!company) {
      throw new PublicCompanyNotFoundError();
    }

    const { configuration, service } = await this.findPublishedConfiguration(
      company,
      input.serviceCode,
    );
    const draftToken = randomBytes(48).toString("base64url");
    const data = createDefaultDraftData();
    const request = await this.dependencies.quoteRequestRepository.createDraft({
      id: randomUUID(),
      companyId: company.id,
      companyConfigurationId: configuration.id,
      companyServiceId: service.id,
      companyPricingVersionId: configuration.pricingVersion?.id ?? null,
      draftTokenHash: hashToken(draftToken),
      data,
      expiresAt: addDays(now, this.draftExpirationDays()),
      now,
      answers: createAnswerRows(data),
    });

    return {
      draft: this.toDraftDetail({ company, configuration, request, service }),
      draftToken,
    };
  }

  async getDraft(draftToken: string): Promise<QuoteDraftResponse> {
    const context = await this.loadDraftContext(draftToken);
    this.assertNotExpired(context.request);

    return {
      draft: this.toDraftDetail(context),
    };
  }

  async updateDraft(
    draftToken: string,
    input: UpdateQuoteDraftRequest,
  ): Promise<QuoteDraftResponse> {
    const context = await this.loadEditableDraftContext(draftToken);
    const data = mergeDraftData(context.request.data, input);
    const request = await this.dependencies.quoteRequestRepository.updateDraft({
      quoteRequestId: context.request.id,
      data,
      now: this.now(),
      answers: createAnswerRows(data),
    });

    return {
      draft: this.toDraftDetail({
        ...context,
        request,
      }),
    };
  }

  async addDraftFile(
    draftToken: string,
    input: QuoteDraftFileMetadataRequest,
  ): Promise<QuoteDraftResponse> {
    const context = await this.loadEditableDraftContext(draftToken);

    if (
      input.itemId &&
      !context.request.data.items.some((item) => item.id === input.itemId)
    ) {
      throw new PublicQuoteSubmissionValidationError(
        "File item does not belong to this draft.",
      );
    }

    await this.dependencies.quoteRequestRepository.addDraftFile({
      id: randomUUID(),
      quoteRequestId: context.request.id,
      itemId: input.itemId ?? null,
      fieldCode: input.fieldCode ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      now: this.now(),
    });

    const refreshed = await this.loadDraftContext(draftToken);
    return {
      draft: this.toDraftDetail(refreshed),
    };
  }

  async deleteDraftFile(draftToken: string, fileId: string): Promise<QuoteDraftResponse> {
    const context = await this.loadEditableDraftContext(draftToken);
    await this.dependencies.quoteRequestRepository.deleteDraftFile({
      quoteRequestId: context.request.id,
      fileId,
    });

    const refreshed = await this.loadDraftContext(draftToken);
    return {
      draft: this.toDraftDetail(refreshed),
    };
  }

  async estimateDraft(draftToken: string): Promise<QuoteEstimateResponse> {
    const context = await this.loadEditableDraftContext(draftToken);
    const calculatedAt = this.now();
    const { calculation, summary } = this.calculateDraft(context, calculatedAt);
    const request = await this.dependencies.quoteRequestRepository.saveCalculation({
      id: randomUUID(),
      quoteRequestId: context.request.id,
      calculationSnapshot: {
        ...calculation.snapshot,
        summary,
      },
      internalTotalCents: calculation.internalTotalCents,
      estimateMinCents: calculation.estimateMinCents,
      estimateMaxCents: calculation.estimateMaxCents,
      now: calculatedAt,
    });

    return {
      draft: this.toDraftDetail({
        ...context,
        request,
      }),
      estimate: summary,
      calculation: calculation.finalCalculation,
    };
  }

  async submitDraft(
    draftToken: string,
    input: SubmitQuoteDraftRequest,
    metadata: RequestMetadata,
  ): Promise<QuoteSubmitResponse> {
    const context = await this.loadDraftContext(draftToken);
    const idempotencyKey = input.idempotencyKey ?? metadata.idempotencyKey;

    if (!idempotencyKey) {
      throw new PublicQuoteIdempotencyRequiredError();
    }

    try {
      parseIdempotencyKey(idempotencyKey);
    } catch {
      throw new PublicQuoteIdempotencyRequiredError();
    }

    const scope = `quote_request_submit:${context.request.id}`;
    const requestHash = hashJson({
      acceptedLegalTerms: input.acceptedLegalTerms,
      draftId: context.request.id,
      data: context.request.data,
    });
    const existing = await this.dependencies.quoteRequestRepository.findIdempotencyRecord(
      {
        scope,
        key: idempotencyKey,
      },
    );

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new PublicQuoteIdempotencyConflictError();
      }

      return existing.responseBody;
    }

    this.assertNotExpired(context.request);

    try {
      assertDraftQuoteRequest(context.request.status);
    } catch (error) {
      if (error instanceof QuoteRequestLifecycleError) {
        throw new PublicQuoteDraftNotEditableError();
      }

      throw error;
    }

    validateSubmissionData(context.request.data, context.request.files.length);

    const now = this.now();
    const { calculation, summary } = this.calculateDraft(context, now);
    const publicToken = randomBytes(48).toString("base64url");
    const requestCode = createRequestCode(now);
    const submittedAt = now;
    const responseBody: QuoteSubmitResponse = {
      requestCode,
      trackingPath: `/acompanhar/${publicToken}`,
      submittedAt: submittedAt.toISOString(),
      estimate: summary,
    };

    await this.dependencies.quoteRequestRepository.submitDraft({
      id: randomUUID(),
      quoteRequestId: context.request.id,
      requestCode,
      submittedAt,
      publicTokenId: randomUUID(),
      publicTokenHash: hashToken(publicToken),
      publicTokenExpiresAt: null,
      configurationSnapshot: createConfigurationSnapshot(context.configuration),
      legalSnapshot: createLegalSnapshot(context, input, metadata, submittedAt),
      calculationSnapshot: {
        ...calculation.snapshot,
        summary,
      },
      internalTotalCents: calculation.internalTotalCents,
      estimateMinCents: calculation.estimateMinCents,
      estimateMaxCents: calculation.estimateMaxCents,
      now,
      idempotency: {
        id: randomUUID(),
        scope,
        key: idempotencyKey,
        requestHash,
        responseBody,
        statusCode: 200,
        expiresAt: addDays(now, 1),
      },
    });

    await this.createNotification({
      companyId: context.company.id,
      type: "new_quote_request",
      title: "Nova solicitacao",
      message: `Solicitacao ${requestCode} recebida pelo perfil publico.`,
      entityType: "quote_request",
      entityId: context.request.id,
      metadata: {
        requestCode,
        customerName: context.request.data.contact.name,
      },
      now,
    });

    await this.dependencies.emailAdapter?.sendQuoteRequestConfirmation?.({
      to: context.request.data.contact.email,
      name: context.request.data.contact.name,
      companyName: context.company.tradingName,
      requestCode,
      trackingPath: responseBody.trackingPath,
    });

    return responseBody;
  }

  async getTracking(publicToken: string): Promise<PublicTrackingResponse> {
    const context = await this.loadTrackingContext(publicToken);
    return this.toTrackingResponse(context);
  }

  async getPublicProposal(
    publicToken: string,
  ): Promise<PublicTrackingProposalDetailResponse> {
    const context = await this.loadTrackingContext(publicToken);
    const proposal = await this.findPublicProposal(context);

    return {
      proposal,
    };
  }

  async getPublicProposalPdf(publicToken: string): Promise<GeneratedProposalPdf> {
    const context = await this.loadTrackingContext(publicToken);
    const proposal = await this.findPublicProposal(context);
    const version = proposal.latestVersion;

    if (!version) {
      throw new PublicProposalUnavailableError();
    }

    const appointments = await this.dependencies.quoteRequestRepository.listAppointments({
      companyId: context.request.companyId,
      quoteRequestId: context.request.id,
    });

    return createPublicProposalPdf({
      company: context.company,
      request: context.request,
      service: context.service,
      proposal,
      appointment: latestAppointmentForProposalVersion(appointments, version.id),
      generatedAt: this.now(),
    });
  }

  async acceptPublicProposal(
    publicToken: string,
    input: PublicProposalAcceptRequest,
    metadata: RequestMetadata,
  ): Promise<PublicTrackingProposalActionResponse> {
    const context = await this.loadTrackingContext(publicToken);
    const proposal = await this.findPublicProposal(context);
    const version = proposal.latestVersion;
    const idempotencyKey = input.idempotencyKey ?? metadata.idempotencyKey;

    if (!version || !idempotencyKey) {
      throw new PublicProposalIdempotencyRequiredError();
    }

    try {
      parseIdempotencyKey(idempotencyKey);
    } catch {
      throw new PublicProposalIdempotencyRequiredError();
    }

    const scope = `proposal_accept:${proposal.id}`;
    const requestHash = hashJson({
      action: "accept",
      acceptedLegalTerms: input.acceptedLegalTerms,
      quoteId: proposal.id,
      quoteVersionId: version.id,
      proposalCode: version.proposalCode,
    });
    const existing =
      await this.dependencies.quoteRequestRepository.findProposalActionIdempotencyRecord({
        scope,
        key: idempotencyKey,
      });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new PublicProposalIdempotencyConflictError();
      }

      return {
        proposal: await this.findPublicProposal(context),
        tracking: await this.toTrackingResponse(context),
      };
    }

    if (proposal.acceptance || version.status === "accepted") {
      return {
        proposal,
        tracking: await this.toTrackingResponse(context),
      };
    }

    if (version.status === "rejected") {
      throw new PublicProposalAlreadyDecidedError();
    }

    const now = this.now();
    let toStatus: QuoteVersionStatus;

    try {
      toStatus = assertCanAcceptProposalVersion({
        status: version.status,
        now,
        validUntil: new Date(version.validUntil),
      });
    } catch (error) {
      if (
        error instanceof ProposalLifecycleError &&
        error.code === "PROPOSAL_VERSION_EXPIRED"
      ) {
        throw new PublicProposalExpiredError();
      }

      if (error instanceof ProposalLifecycleError) {
        throw new PublicProposalAlreadyDecidedError();
      }

      throw error;
    }

    const legalVersions = createProposalLegalVersions({
      proposalTermsVersion: version.termsVersion,
      hasCompanyTerms: Boolean(context.company.profile.terms?.trim()),
    });

    const accepted = await this.dependencies.quoteRequestRepository.acceptProposal({
      id: randomUUID(),
      quoteId: proposal.id,
      quoteVersionId: version.id,
      quoteRequestId: context.request.id,
      companyId: context.request.companyId,
      requestCode: context.request.requestCode!,
      proposalCode: version.proposalCode,
      customerName: context.request.data.contact.name,
      customerWhatsapp: context.request.data.contact.whatsapp,
      customerEmail: context.request.data.contact.email || null,
      finalTotalCents: version.finalTotalCents,
      termsVersion: legalVersions.termsVersion,
      privacyPolicyVersion: legalVersions.privacyPolicyVersion,
      estimateDisclaimerVersion: legalVersions.estimateDisclaimerVersion,
      companyTermsVersion: legalVersions.companyTermsVersion,
      legalSnapshot: createProposalAcceptanceLegalSnapshot({
        context,
        proposal,
        version,
        legalVersions,
        acceptedAt: now,
        metadata,
      }),
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
      idempotencyKey,
      metadata: {
        source: "public_tracking",
        acceptedLegalTerms: input.acceptedLegalTerms,
      },
      fromStatus: version.status,
      toStatus,
      quoteStatus: "accepted",
      now,
      idempotency: {
        id: randomUUID(),
        scope,
        key: idempotencyKey,
        requestHash,
        responseBody: {
          quoteId: proposal.id,
          quoteVersionId: version.id,
        },
        statusCode: 200,
        expiresAt: addDays(now, 1),
      },
    });

    await this.createNotification({
      companyId: context.request.companyId,
      type: "proposal_accepted_by_customer",
      title: "Proposta aceita",
      message: `O cliente aceitou a proposta ${version.proposalCode}.`,
      entityType: "quote",
      entityId: proposal.id,
      metadata: {
        quoteRequestId: context.request.id,
        requestCode: context.request.requestCode,
        quoteVersionId: version.id,
        proposalCode: version.proposalCode,
        finalTotalCents: version.finalTotalCents,
      },
      now,
    });

    return {
      proposal: accepted,
      tracking: await this.toTrackingResponse(context),
    };
  }

  async rejectPublicProposal(
    publicToken: string,
    input: PublicProposalRejectRequest,
    metadata: RequestMetadata,
  ): Promise<PublicTrackingProposalActionResponse> {
    const context = await this.loadTrackingContext(publicToken);
    const proposal = await this.findPublicProposal(context);
    const version = proposal.latestVersion;
    const idempotencyKey = input.idempotencyKey ?? metadata.idempotencyKey;

    if (!version || !idempotencyKey) {
      throw new PublicProposalIdempotencyRequiredError();
    }

    try {
      parseIdempotencyKey(idempotencyKey);
    } catch {
      throw new PublicProposalIdempotencyRequiredError();
    }

    const reason = input.reason?.trim() || null;
    const scope = `proposal_reject:${proposal.id}`;
    const requestHash = hashJson({
      action: "reject",
      quoteId: proposal.id,
      quoteVersionId: version.id,
      proposalCode: version.proposalCode,
      reasonCode: input.reasonCode,
      reason,
    });
    const existing =
      await this.dependencies.quoteRequestRepository.findProposalActionIdempotencyRecord({
        scope,
        key: idempotencyKey,
      });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new PublicProposalIdempotencyConflictError();
      }

      return {
        proposal: await this.findPublicProposal(context),
        tracking: await this.toTrackingResponse(context),
      };
    }

    if (version.status === "rejected") {
      return {
        proposal,
        tracking: await this.toTrackingResponse(context),
      };
    }

    if (proposal.acceptance || version.status === "accepted") {
      throw new PublicProposalAlreadyDecidedError();
    }

    const now = this.now();
    let toStatus: QuoteVersionStatus;

    try {
      toStatus = assertCanRejectProposalVersion({
        status: version.status,
      });
    } catch (error) {
      if (error instanceof ProposalLifecycleError) {
        throw new PublicProposalAlreadyDecidedError();
      }

      throw error;
    }

    const rejected = await this.dependencies.quoteRequestRepository.rejectProposal({
      quoteId: proposal.id,
      quoteVersionId: version.id,
      quoteRequestId: context.request.id,
      companyId: context.request.companyId,
      fromStatus: version.status,
      toStatus,
      quoteStatus: "rejected",
      reasonCode: input.reasonCode,
      reason,
      now,
      idempotency: {
        id: randomUUID(),
        scope,
        key: idempotencyKey,
        requestHash,
        responseBody: {
          quoteId: proposal.id,
          quoteVersionId: version.id,
        },
        statusCode: 200,
        expiresAt: addDays(now, 1),
      },
    });

    await this.createNotification({
      companyId: context.request.companyId,
      type: "proposal_rejected_by_customer",
      title: "Proposta recusada",
      message: `O cliente recusou a proposta ${version.proposalCode}.`,
      entityType: "quote",
      entityId: proposal.id,
      metadata: {
        quoteRequestId: context.request.id,
        requestCode: context.request.requestCode,
        quoteVersionId: version.id,
        proposalCode: version.proposalCode,
        reasonCode: input.reasonCode,
        reason,
      },
      now,
    });

    return {
      proposal: rejected,
      tracking: await this.toTrackingResponse(context),
    };
  }

  async createPublicReview(
    input: PublicReviewCreateRequest,
    metadata: RequestMetadata,
  ): Promise<PublicReviewCreateResponse> {
    const idempotencyKey = input.idempotencyKey ?? metadata.idempotencyKey;

    if (!idempotencyKey) {
      throw new PublicReviewIdempotencyRequiredError();
    }

    try {
      parseIdempotencyKey(idempotencyKey);
    } catch {
      throw new PublicReviewIdempotencyRequiredError();
    }

    const context = await this.loadTrackingContext(input.publicToken);
    const proposal = await this.findPublicProposal(context);
    const version = proposal.latestVersion;

    if (!version) {
      throw new PublicReviewNotEligibleError();
    }

    const appointments = await this.dependencies.quoteRequestRepository.listAppointments({
      companyId: context.request.companyId,
      quoteRequestId: context.request.id,
    });
    const appointment = latestAppointmentForProposalVersion(appointments, version.id);

    if (!appointment || !context.request.requestCode) {
      throw new PublicReviewNotEligibleError();
    }

    const scope = `review:${appointment.id}`;
    const comment = input.comment?.trim() || null;
    const requestHash = hashJson({
      action: "create_review",
      appointmentId: appointment.id,
      quoteId: proposal.id,
      quoteVersionId: version.id,
      rating: input.rating,
      comment,
    });
    const existingIdempotency =
      await this.dependencies.quoteRequestRepository.findReviewIdempotencyRecord({
        scope,
        key: idempotencyKey,
      });
    const existingReview =
      await this.dependencies.quoteRequestRepository.findReviewByAppointmentId(
        appointment.id,
      );

    if (existingIdempotency) {
      if (existingIdempotency.requestHash !== requestHash) {
        throw new PublicReviewIdempotencyConflictError();
      }

      if (existingReview) {
        return { review: existingReview };
      }
    }

    try {
      assertCanCreateReview({
        proposalAccepted: isAcceptedProposalVersion(proposal, version.id),
        appointmentConfirmed: Boolean(
          appointment.confirmedAt || appointment.status === "completed",
        ),
        serviceStatus: appointment.serviceStatus,
        alreadyReviewed: Boolean(existingReview),
      });
    } catch (error) {
      if (error instanceof ServiceLifecycleError) {
        throw new PublicReviewNotEligibleError(`PUBLIC_${error.code}`);
      }

      throw error;
    }

    const now = this.now();
    const reviewId = randomUUID();
    const review = await this.dependencies.quoteRequestRepository.createReview({
      id: reviewId,
      companyId: context.request.companyId,
      quoteId: proposal.id,
      quoteVersionId: version.id,
      quoteRequestId: context.request.id,
      appointmentId: appointment.id,
      customerProfileId: context.request.customerId,
      customerName: context.request.data.contact.name,
      customerEmail: context.request.data.contact.email || null,
      requestCode: context.request.requestCode,
      proposalCode: version.proposalCode,
      serviceName: context.service.name,
      rating: input.rating,
      comment,
      metadata: {
        source: "public_tracking",
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
      },
      now,
      idempotency: {
        id: randomUUID(),
        scope,
        key: idempotencyKey,
        requestHash,
        responseBody: {
          reviewId,
        },
        statusCode: 201,
        expiresAt: addDays(now, 1),
      },
    });

    await this.createNotification({
      companyId: context.request.companyId,
      type: "review_received",
      title: "Nova avaliacao recebida",
      message: `O cliente avaliou ${context.service.name} com ${input.rating} estrela(s).`,
      entityType: "review",
      entityId: review.id,
      metadata: {
        quoteRequestId: context.request.id,
        requestCode: context.request.requestCode,
        appointmentId: appointment.id,
        rating: input.rating,
      },
      now,
    });

    return {
      review,
    };
  }

  async requestRecovery(
    input: PublicTrackingRecoveryRequest,
    metadata: RequestMetadata,
  ): Promise<PublicTrackingRecoveryRequestResponse> {
    const requestCode = normalizeRequestCode(input.requestCode);
    const request =
      await this.dependencies.quoteRequestRepository.findSubmittedByRequestCode(
        requestCode,
      );

    if (!request?.requestCode) {
      throw new PublicRecoveryInvalidError();
    }

    const match = matchRecoveryContact(request, input.contact);

    if (!match) {
      throw new PublicRecoveryInvalidError();
    }

    const email = request.data.contact.email.trim().toLowerCase();

    if (!email) {
      throw new PublicRecoveryEmailRequiredError();
    }

    const now = this.now();
    const recoveryToken = randomBytes(48).toString("base64url");
    const otp = createOtp();
    const expiresAt = addMinutes(now, this.recoveryOtpTtlMinutes());

    await this.dependencies.quoteRequestRepository.createRecoveryCode({
      id: randomUUID(),
      quoteRequestId: request.id,
      requestCode,
      contactType: match.contactType,
      contactHash: hashToken(match.normalizedContact),
      tokenHash: hashToken(recoveryToken),
      otpHash: hashToken(otp),
      maxAttempts: this.recoveryMaxAttempts(),
      expiresAt,
      metadata: {
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
      },
      now,
    });

    await this.dependencies.emailAdapter?.sendRecoveryOtp?.({
      to: email,
      name: request.data.contact.name,
      requestCode,
      otp,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      recoveryToken,
      maskedEmail: maskEmail(email),
      expiresAt: expiresAt.toISOString(),
      deliveryChannel: "email",
      contactMatchedBy: match.contactType,
    };
  }

  async verifyRecovery(
    input: PublicTrackingRecoveryVerifyRequest,
  ): Promise<PublicTrackingRecoveryVerifyResponse> {
    const requestCode = normalizeRequestCode(input.requestCode);
    const recoveryCode =
      await this.dependencies.quoteRequestRepository.findRecoveryCodeByTokenHash(
        hashToken(input.recoveryToken),
      );

    if (!recoveryCode || recoveryCode.requestCode !== requestCode) {
      throw new PublicRecoveryInvalidError();
    }

    const now = this.now();

    if (recoveryCode.usedAt || recoveryCode.revokedAt) {
      throw new PublicRecoveryInvalidError();
    }

    if (new Date(recoveryCode.expiresAt).getTime() <= now.getTime()) {
      throw new PublicRecoveryOtpExpiredError();
    }

    if (recoveryCode.attempts >= recoveryCode.maxAttempts) {
      throw new PublicRecoveryAttemptsExceededError();
    }

    if (recoveryCode.otpHash !== hashToken(input.otp.trim())) {
      const attempts = recoveryCode.attempts + 1;
      await this.dependencies.quoteRequestRepository.recordRecoveryAttempt({
        recoveryCodeId: recoveryCode.id,
        attempts,
        revokedAt: attempts >= recoveryCode.maxAttempts ? now : null,
        now,
      });
      throw new PublicRecoveryOtpInvalidError();
    }

    const request =
      await this.dependencies.quoteRequestRepository.findSubmittedByRequestCode(
        requestCode,
      );

    if (!request || request.id !== recoveryCode.quoteRequestId || !request.requestCode) {
      throw new PublicRecoveryInvalidError();
    }

    const publicToken = randomBytes(48).toString("base64url");
    await this.dependencies.quoteRequestRepository.replacePublicTokenAfterRecovery({
      quoteRequestId: request.id,
      requestCode,
      previousPublicTokenId: request.publicTokenId,
      recoveryCodeId: recoveryCode.id,
      newPublicTokenId: randomUUID(),
      newPublicTokenHash: hashToken(publicToken),
      newPublicTokenExpiresAt: null,
      now,
    });

    return {
      requestCode,
      publicToken,
      trackingPath: `/acompanhar/${publicToken}`,
    };
  }

  async recordPublicAppointmentAction(
    publicToken: string,
    input: CustomerAppointmentActionRequest,
  ): Promise<PublicTrackingAppointmentActionResponse> {
    const appointmentService = this.dependencies.companyAppointmentService;

    if (!appointmentService) {
      throw new PublicTrackingAppointmentUnavailableError();
    }

    const context = await this.loadTrackingContext(publicToken);
    const appointments = await this.dependencies.quoteRequestRepository.listAppointments({
      companyId: context.request.companyId,
      quoteRequestId: context.request.id,
    });
    const appointment = latestActionableAppointment(appointments);

    if (!appointment) {
      throw new PublicTrackingAppointmentUnavailableError();
    }

    const response = await appointmentService.recordCustomerAppointmentAction({
      companyId: context.request.companyId,
      appointmentId: appointment.id,
      body: input,
    });
    const now = this.now();

    await this.createNotification({
      companyId: context.request.companyId,
      type:
        input.action === "confirm"
          ? "appointment_confirmed_by_customer"
          : "appointment_reschedule_requested",
      title:
        input.action === "confirm" ? "Horario confirmado" : "Cliente pediu outro horario",
      message:
        input.action === "confirm"
          ? `O cliente confirmou o horario da solicitacao ${context.request.requestCode}.`
          : `O cliente pediu outro horario para a solicitacao ${context.request.requestCode}.`,
      entityType: "appointment",
      entityId: response.appointment.id,
      metadata:
        input.action === "request_reschedule"
          ? { reason: input.reason?.trim() || null }
          : {},
      now,
    });

    return {
      appointment: response.appointment,
      tracking: await this.getTracking(publicToken),
    };
  }

  private async findPublicProposal(
    context: TrackingContext,
  ): Promise<PublicProposalDetail> {
    const proposal =
      await this.dependencies.quoteRequestRepository.findLatestPublicProposal({
        companyId: context.request.companyId,
        quoteRequestId: context.request.id,
      });

    if (!proposal?.latestVersion || !isPublicProposalVisible(proposal)) {
      throw new PublicProposalUnavailableError();
    }

    return proposal;
  }

  private async loadDraftContext(draftToken: string): Promise<DraftContext> {
    const request = await this.dependencies.quoteRequestRepository.findByDraftTokenHash(
      hashToken(draftToken),
    );

    if (!request) {
      throw new PublicQuoteDraftNotFoundError();
    }

    const company =
      await this.dependencies.publicCompanyRepository.findPublishedCompanyById(
        request.companyId,
      );

    if (!company) {
      throw new PublicCompanyNotFoundError();
    }

    const configuration =
      await this.dependencies.templateRepository.findCompanyConfigurationById(
        request.companyConfigurationId,
      );

    if (!configuration) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    const service = configuration.services.find(
      (candidate) => candidate.id === request.companyServiceId,
    );

    if (!service) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    return {
      company,
      configuration,
      request,
      service,
    };
  }

  private async loadEditableDraftContext(draftToken: string): Promise<DraftContext> {
    const context = await this.loadDraftContext(draftToken);
    this.assertNotExpired(context.request);

    try {
      assertDraftQuoteRequest(context.request.status);
    } catch (error) {
      if (error instanceof QuoteRequestLifecycleError) {
        throw new PublicQuoteDraftNotEditableError();
      }

      throw error;
    }

    return context;
  }

  private async loadTrackingContext(publicToken: string): Promise<TrackingContext> {
    const request = await this.dependencies.quoteRequestRepository.findByPublicTokenHash({
      publicTokenHash: hashToken(publicToken),
      now: this.now(),
    });

    if (!request || !request.requestCode || !request.submittedAt) {
      throw new PublicTrackingTokenInvalidError();
    }

    const company =
      await this.dependencies.publicCompanyRepository.findPublishedCompanyById(
        request.companyId,
      );

    if (!company) {
      throw new PublicCompanyNotFoundError();
    }

    const configuration =
      await this.dependencies.templateRepository.findCompanyConfigurationById(
        request.companyConfigurationId,
      );

    if (!configuration) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    const service = configuration.services.find(
      (candidate) => candidate.id === request.companyServiceId,
    );

    if (!service) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    return {
      company,
      configuration,
      request,
      service,
    };
  }

  private assertNotExpired(request: PersistedQuoteRequest) {
    if (request.status === "draft" && new Date(request.expiresAt) < this.now()) {
      throw new PublicQuoteDraftExpiredError();
    }
  }

  private async findPublishedConfiguration(
    company: PersistedPublicCompany,
    serviceCode: string | undefined,
  ) {
    const templates = await this.dependencies.templateRepository.listTemplates();
    const template = templates.find(
      (candidate) => candidate.code === company.profile.nicheCode,
    );

    if (!template) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    const configuration =
      await this.dependencies.templateRepository.findLatestCompanyConfiguration({
        companyId: company.id,
        templateId: template.id,
        statuses: ["published"],
      });

    if (!configuration) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    const activeServices = configuration.services
      .filter((service) => service.isActive)
      .sort((left, right) => left.displayOrder - right.displayOrder);
    const service = serviceCode
      ? activeServices.find((candidate) => candidate.code === serviceCode)
      : activeServices[0];

    if (!service) {
      throw new PublicQuoteConfigurationUnavailableError();
    }

    return {
      configuration,
      service,
    };
  }

  private calculateDraft(context: DraftContext, calculatedAt: Date) {
    try {
      const calculation = calculateQuoteRequestEstimate({
        configurationVersion: context.configuration.version,
        pricingVersion: context.configuration.pricingVersion?.version ?? 1,
        requestAnswers: createRequestAnswers(context.request.data),
        items: context.request.data.items.map((item, index) => ({
          id: item.id,
          label: item.label || `Item ${index + 1}`,
          quantity: item.quantity,
          answers: createItemAnswers(item),
        })),
        rules: context.service.pricingRules.map(toCalculationRule),
        estimateMarginLowerBps: context.service.estimateMarginLowerBps,
        estimateMarginUpperBps: context.service.estimateMarginUpperBps,
      });
      const summary = createEstimateSummary(calculation, calculatedAt);

      return {
        calculation,
        summary,
      };
    } catch (error) {
      if (error instanceof CalculationError) {
        throw new PublicQuoteCalculationError(error.code, error.message);
      }

      throw error;
    }
  }

  private toDraftDetail(context: DraftContext): QuoteDraftDetail {
    const pricingVersion = context.configuration.pricingVersion?.version ?? 1;

    return {
      id: context.request.id,
      status: context.request.status,
      companyId: context.company.id,
      companySlug: context.company.slug,
      companyName: context.company.tradingName,
      requestCode: context.request.requestCode,
      service: {
        id: context.service.id,
        code: context.service.code,
        name: context.service.name,
        schedulingMode: context.service.schedulingMode,
        estimatedDurationMinutes: context.service.estimatedDurationMinutes,
        estimateMarginLowerBps: context.service.estimateMarginLowerBps,
        estimateMarginUpperBps: context.service.estimateMarginUpperBps,
        fields: context.service.fields.filter(
          (field) => field.isActive && field.isClientVisible,
        ),
      },
      configurationVersion: context.configuration.version,
      pricingVersion,
      expiresAt: context.request.expiresAt,
      submittedAt: context.request.submittedAt,
      data: context.request.data,
      files: context.request.files,
      estimate: estimateFromSnapshot(context.request.calculationSnapshot),
    };
  }

  private async toTrackingResponse(
    context: TrackingContext,
  ): Promise<PublicTrackingResponse> {
    if (!context.request.requestCode || !context.request.submittedAt) {
      throw new PublicTrackingTokenInvalidError();
    }

    const [proposals, appointments] = await Promise.all([
      this.dependencies.quoteRequestRepository.listProposalSummaries({
        companyId: context.request.companyId,
        quoteRequestId: context.request.id,
      }),
      this.dependencies.quoteRequestRepository.listAppointments({
        companyId: context.request.companyId,
        quoteRequestId: context.request.id,
      }),
    ]);

    return {
      quoteRequest: {
        id: context.request.id,
        requestCode: context.request.requestCode,
        status: context.request.status,
        submittedAt: context.request.submittedAt,
        updatedAt: context.request.updatedAt,
        data: context.request.data,
        files: context.request.files,
        estimate: estimateFromSnapshot(context.request.calculationSnapshot),
      },
      company: {
        id: context.company.id,
        name: context.company.tradingName,
        slug: context.company.slug,
        whatsapp: context.company.profile.contactWhatsapp ?? null,
        email: context.company.profile.contactEmail ?? null,
      },
      service: {
        id: context.service.id,
        code: context.service.code,
        name: context.service.name,
        schedulingMode: context.service.schedulingMode,
        estimatedDurationMinutes: context.service.estimatedDurationMinutes,
      },
      latestProposal: getLatestPublicProposal(proposals),
      appointments,
      whatsappUrl: createWhatsappUrl({
        phone: context.company.profile.contactWhatsapp,
        requestCode: context.request.requestCode,
        customerName: context.request.data.contact.name,
      }),
    };
  }

  private async createNotification(input: {
    companyId: string;
    type: string;
    title: string;
    message: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
    now: Date;
  }) {
    await this.dependencies.quoteRequestRepository.createNotification({
      id: randomUUID(),
      companyId: input.companyId,
      userId: null,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      now: input.now,
    });
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }

  private draftExpirationDays() {
    return this.dependencies.draftExpirationDays ?? env.DRAFT_EXPIRATION_DAYS;
  }

  private recoveryOtpTtlMinutes() {
    return this.dependencies.recoveryOtpTtlMinutes ?? env.PUBLIC_RECOVERY_OTP_TTL_MINUTES;
  }

  private recoveryMaxAttempts() {
    return this.dependencies.recoveryMaxAttempts ?? env.PUBLIC_RECOVERY_MAX_ATTEMPTS;
  }
}

function createDefaultDraftData(): QuoteDraftData {
  return quoteDraftDataSchema.parse({
    currentStep: "items",
    items: [
      {
        id: randomUUID(),
        label: "Item 1",
        itemType: "sofa",
        quantity: 1,
        size: "medium",
        seats: 3,
        fabricType: "suede",
        dirtLevel: "medium",
        hasStains: false,
        stainTypes: [],
        odor: false,
        petHair: false,
        petsPresent: false,
        waterproofing: false,
        notes: "",
      },
    ],
    address: {},
    access: {
      urgency: "normal",
      floor: 0,
      hasElevator: true,
      parking: true,
      distanceKm: 0,
    },
    contact: {},
    notes: "",
  });
}

function mergeDraftData(
  current: QuoteDraftData,
  input: UpdateQuoteDraftRequest,
): QuoteDraftData {
  return quoteDraftDataSchema.parse({
    currentStep: input.currentStep ?? current.currentStep,
    items: input.items ?? current.items,
    address: {
      ...current.address,
      ...(input.address ?? {}),
    },
    access: {
      ...current.access,
      ...(input.access ?? {}),
    },
    contact: {
      ...current.contact,
      ...(input.contact ?? {}),
    },
    notes: input.notes ?? current.notes,
  });
}

function createAnswerRows(data: QuoteDraftData): QuoteRequestAnswerInput[] {
  const answers: QuoteRequestAnswerInput[] = [];

  for (const item of data.items) {
    answers.push(
      answerRow(item.id, "item_type", item.itemType),
      answerRow(item.id, "quantity", item.quantity),
      answerRow(item.id, "size", item.size),
      answerRow(item.id, "seats", item.seats),
      answerRow(item.id, "fabric_type", item.fabricType),
      answerRow(item.id, "dirt_level", item.dirtLevel),
      answerRow(item.id, "has_stains", item.hasStains),
      answerRow(item.id, "stain_type", item.stainTypes),
      answerRow(item.id, "odor", item.odor),
      answerRow(item.id, "pet_hair", item.petHair),
      answerRow(item.id, "pets_present", item.petsPresent),
      answerRow(item.id, "waterproofing", item.waterproofing),
    );
  }

  answers.push(
    answerRow(null, "urgency", data.access.urgency),
    answerRow(null, "floor", data.access.floor),
    answerRow(null, "has_elevator", data.access.hasElevator),
    answerRow(null, "parking", data.access.parking),
    measurementAnswerRow(null, "distance_km", data.access.distanceKm, "km"),
    answerRow(null, "service_address", data.address),
    answerRow(null, "customer_contact", data.contact),
  );

  return answers;
}

function answerRow(
  itemId: string | null,
  fieldCode: string,
  value: unknown,
): QuoteRequestAnswerInput {
  return {
    id: randomUUID(),
    itemId,
    fieldCode,
    value,
    originalValue: null,
    originalUnit: null,
    normalizedValue: null,
    normalizedUnit: null,
    metadata: itemId ? { scope: "item" } : { scope: "request" },
  };
}

function measurementAnswerRow(
  itemId: string | null,
  fieldCode: string,
  value: number,
  unit: "km",
): QuoteRequestAnswerInput {
  return {
    id: randomUUID(),
    itemId,
    fieldCode,
    value: {
      originalValue: value,
      originalUnit: unit,
      normalizedValue: value,
      normalizedUnit: unit,
    },
    originalValue: String(value),
    originalUnit: unit,
    normalizedValue: String(value),
    normalizedUnit: unit,
    metadata: itemId ? { scope: "item" } : { scope: "request" },
  };
}

function createItemAnswers(item: QuoteDraftData["items"][number]): CalculationAnswers {
  return {
    item_type: item.itemType,
    quantity: item.quantity,
    size: item.size,
    seats: item.seats,
    fabric_type: item.fabricType,
    dirt_level: item.dirtLevel,
    has_stains: item.hasStains,
    stain_type: item.stainTypes,
    odor: item.odor,
    pet_hair: item.petHair,
    pets_present: item.petsPresent,
    waterproofing: item.waterproofing,
  };
}

function createRequestAnswers(data: QuoteDraftData): CalculationAnswers {
  return {
    urgency: data.access.urgency,
    floor: data.access.floor,
    has_elevator: data.access.hasElevator,
    parking: data.access.parking,
    distance_km: {
      originalValue: data.access.distanceKm,
      originalUnit: "km",
      normalizedValue: data.access.distanceKm,
      normalizedUnit: "km",
    },
  };
}

function createEstimateSummary(
  calculation: ReturnType<typeof calculateQuoteRequestEstimate>,
  calculatedAt: Date,
): QuoteEstimateSummary {
  return {
    currency: "BRL",
    calculatedAt: calculatedAt.toISOString(),
    internalTotalCents: calculation.internalTotalCents,
    estimateMinCents: calculation.estimateMinCents,
    estimateMaxCents: calculation.estimateMaxCents,
    itemEstimates: calculation.itemResults.map((item): QuoteItemEstimateSummary => ({
      itemId: item.itemId,
      label: item.label,
      quantity: item.quantity,
      internalTotalCents: item.internalTotalCents,
      lines: item.lines,
    })),
    requestAdjustments: calculation.requestAdjustments,
  };
}

function estimateFromSnapshot(
  snapshot: Record<string, unknown> | null,
): QuoteEstimateSummary | null {
  const candidate = snapshot?.summary;

  if (!isEstimateSummary(candidate)) {
    return null;
  }

  return candidate;
}

function isEstimateSummary(value: unknown): value is QuoteEstimateSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<QuoteEstimateSummary>;
  return (
    candidate.currency === "BRL" &&
    typeof candidate.calculatedAt === "string" &&
    typeof candidate.internalTotalCents === "number" &&
    typeof candidate.estimateMinCents === "number" &&
    typeof candidate.estimateMaxCents === "number" &&
    Array.isArray(candidate.itemEstimates) &&
    Array.isArray(candidate.requestAdjustments)
  );
}

function validateSubmissionData(data: QuoteDraftData, fileCount: number) {
  if (data.items.length === 0) {
    throw new PublicQuoteSubmissionValidationError("Add at least one item.");
  }

  if (!data.contact.name.trim()) {
    throw new PublicQuoteSubmissionValidationError("Customer name is required.");
  }

  if (data.contact.whatsapp.trim().length < 8) {
    throw new PublicQuoteSubmissionValidationError("Customer WhatsApp is required.");
  }

  if (!hasAddress(data)) {
    throw new PublicQuoteSubmissionValidationError("Service address is required.");
  }

  if (fileCount === 0) {
    throw new PublicQuoteSubmissionValidationError(
      "At least one photo or file is required.",
    );
  }
}

function hasAddress(data: QuoteDraftData) {
  return (
    Boolean(data.address.fullAddress.trim()) ||
    (Boolean(data.address.street.trim()) && Boolean(data.address.city.trim()))
  );
}

function toCalculationRule(rule: PricingRuleConfiguration): CalculationPricingRule {
  return {
    id: rule.id,
    templatePricingRuleId: rule.templatePricingRuleId,
    code: rule.code,
    label: rule.label,
    ruleType: rule.ruleType,
    targetFieldCode: rule.targetFieldCode,
    targetOptionCode: rule.targetOptionCode,
    quantityFieldCode: rule.quantityFieldCode,
    amountCents: rule.amountCents,
    percentageBps: rule.percentageBps,
    multiplierBps: rule.multiplierBps,
    minimumValue: rule.minimumValue,
    maximumValue: rule.maximumValue,
    unit: rule.unit,
    condition: rule.condition,
    roundingMode: rule.roundingMode,
    roundingIncrementCents: rule.roundingIncrementCents,
    isActive: rule.isActive,
    displayOrder: rule.displayOrder,
  };
}

function createConfigurationSnapshot(
  configuration: CompanyConfigurationDetail,
): Record<string, unknown> {
  return (
    (configuration.snapshot as unknown as Record<string, unknown> | null) ?? {
      configurationId: configuration.id,
      companyId: configuration.companyId,
      templateId: configuration.templateId,
      templateCode: configuration.templateCode,
      templateVersion: configuration.templateVersion,
      configurationVersion: configuration.version,
      publishedAt: configuration.publishedAt,
      pricingVersion: configuration.pricingVersion,
      services: configuration.services,
    }
  );
}

function createLegalSnapshot(
  context: DraftContext,
  input: SubmitQuoteDraftRequest,
  metadata: RequestMetadata,
  submittedAt: Date,
): Record<string, unknown> {
  return {
    acceptedLegalTerms: input.acceptedLegalTerms,
    acceptedAt: submittedAt.toISOString(),
    companyTerms: context.company.profile.terms,
    source: "company_public_profile",
    ipAddress: metadata.ipAddress ?? null,
    userAgent: metadata.userAgent ?? null,
  };
}

function createRequestCode(now: Date) {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = randomBytes(4).toString("hex").toUpperCase();

  return `VEL-${date}-${suffix}`;
}

function normalizeRequestCode(value: string) {
  return value.trim().toUpperCase();
}

function matchRecoveryContact(request: PersistedQuoteRequest, contact: string) {
  const normalizedEmail = request.data.contact.email.trim().toLowerCase();
  const normalizedWhatsapp = onlyDigits(request.data.contact.whatsapp);
  const candidateEmail = contact.trim().toLowerCase();
  const candidateWhatsapp = onlyDigits(contact);

  if (normalizedEmail && candidateEmail === normalizedEmail) {
    return {
      contactType: "email" as const,
      normalizedContact: normalizedEmail,
    };
  }

  if (normalizedWhatsapp && candidateWhatsapp === normalizedWhatsapp) {
    return {
      contactType: "whatsapp" as const,
      normalizedContact: normalizedWhatsapp,
    };
  }

  return null;
}

function createOtp() {
  return String(randomInt(100000, 1000000));
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");

  if (!local || !domain) {
    return "e-mail cadastrado";
  }

  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

const publicProposalVisibleStatuses: QuoteVersionStatus[] = [
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
];

function isPublicProposalStatusVisible(status: QuoteVersionStatus | null | undefined) {
  return Boolean(status && publicProposalVisibleStatuses.includes(status));
}

function isPublicProposalVisible(proposal: PublicProposalDetail) {
  const status = proposal.latestVersion?.status;

  return isPublicProposalStatusVisible(status);
}

function isAcceptedProposalVersion(
  proposal: PublicProposalDetail,
  quoteVersionId: string,
) {
  return Boolean(
    proposal.acceptedQuoteVersionId === quoteVersionId ||
    proposal.acceptance?.quoteVersionId === quoteVersionId ||
    proposal.latestVersion?.status === "accepted",
  );
}

function createProposalLegalVersions(input: {
  proposalTermsVersion: string;
  hasCompanyTerms: boolean;
}) {
  return {
    termsVersion: input.proposalTermsVersion,
    privacyPolicyVersion: APP_DEFAULTS.legalVersions.privacyPolicy,
    estimateDisclaimerVersion: APP_DEFAULTS.legalVersions.estimateDisclaimer,
    companyTermsVersion: input.hasCompanyTerms
      ? APP_DEFAULTS.legalVersions.companyTerms
      : null,
  };
}

function createProposalAcceptanceLegalSnapshot(input: {
  context: TrackingContext;
  proposal: PublicProposalDetail;
  version: NonNullable<PublicProposalDetail["latestVersion"]>;
  legalVersions: ReturnType<typeof createProposalLegalVersions>;
  acceptedAt: Date;
  metadata: RequestMetadata;
}): Record<string, unknown> {
  return {
    acceptedLegalTerms: true,
    acceptedAt: input.acceptedAt.toISOString(),
    source: "public_tracking",
    requestLegalSnapshot: input.context.request.legalSnapshot,
    companyTerms: input.context.company.profile.terms,
    legalVersions: input.legalVersions,
    proposal: {
      quoteId: input.proposal.id,
      quoteVersionId: input.version.id,
      proposalCode: input.version.proposalCode,
      versionNumber: input.version.versionNumber,
      finalTotalCents: input.version.finalTotalCents,
      validUntil: input.version.validUntil,
    },
    customer: {
      name: input.context.request.data.contact.name,
      whatsapp: input.context.request.data.contact.whatsapp,
      email: input.context.request.data.contact.email || null,
    },
    ipAddress: input.metadata.ipAddress ?? null,
    userAgent: input.metadata.userAgent ?? null,
  };
}

function getLatestPublicProposal(proposals: CompanyProposalSummary[]) {
  return (
    proposals
      .filter((proposal) => isPublicProposalStatusVisible(proposal.latestVersionStatus))
      .slice()
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )[0] ?? null
  );
}

function latestActionableAppointment(appointments: CompanyAppointment[]) {
  return (
    appointments
      .filter((appointment) => ["proposed", "rescheduled"].includes(appointment.status))
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )[0] ?? null
  );
}

function latestAppointmentForProposalVersion(
  appointments: CompanyAppointment[],
  quoteVersionId: string,
) {
  return (
    appointments
      .filter((appointment) => appointment.quoteVersionId === quoteVersionId)
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )[0] ?? null
  );
}

function createWhatsappUrl(input: {
  phone: string | null | undefined;
  requestCode: string;
  customerName: string;
}) {
  const phone = onlyDigits(input.phone ?? "");

  if (!phone) {
    return null;
  }

  const message = `Ola, sou ${input.customerName || "cliente"} e quero falar sobre a solicitacao ${input.requestCode}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
