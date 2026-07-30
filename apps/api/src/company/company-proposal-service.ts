import { createHash, randomUUID } from "node:crypto";
import {
  APP_DEFAULTS,
  type CompanyCreateProposalRequest,
  type CompanyProposalDetailResponse,
  type CompanyProposalVersion,
} from "@velaris/shared";
import {
  ProposalLifecycleError,
  assertCanCreateProposalVersion,
  assertProposalValidityDate,
  parseIdempotencyKey,
  prepareProposalFinalTotal,
  transitionProposalVersionStatus,
} from "@velaris/domain";
import { estimateFromCalculationSnapshot } from "../quote-requests/quote-request-calculation.js";
import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "./company-account-repository.js";
import {
  CompanyProposalAccessDeniedError,
  CompanyProposalIdempotencyConflictError,
  CompanyProposalIdempotencyRequiredError,
  CompanyProposalLifecycleApiError,
  CompanyProposalNotFoundError,
  CompanyProposalQuoteRequestNotReadyError,
  CompanyProposalValidationError,
} from "./company-proposal-errors.js";
import type {
  CompanyProposalRepository,
  PersistedCompanyProposal,
} from "./company-proposal-repository.js";
import type {
  CompanyQuoteRequestRepository,
  PersistedCompanyQuoteRequest,
} from "./company-quote-request-repository.js";

interface CompanyProposalServiceDependencies {
  accountRepository: CompanyAccountRepository;
  quoteRequestRepository: CompanyQuoteRequestRepository;
  proposalRepository: CompanyProposalRepository;
  now?: () => Date;
}

export class CompanyProposalService {
  constructor(private readonly dependencies: CompanyProposalServiceDependencies) {}

  async createProposalVersion(
    userId: string,
    quoteRequestId: string,
    input: CompanyCreateProposalRequest,
  ): Promise<CompanyProposalDetailResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const quoteRequest = await this.findQuoteRequest(account.companyId, quoteRequestId);

    if (quoteRequest.status !== "accepted_for_proposal") {
      throw new CompanyProposalQuoteRequestNotReadyError();
    }

    const estimate = estimateFromCalculationSnapshot(quoteRequest.calculationSnapshot);

    if (
      !estimate ||
      quoteRequest.internalTotalCents === null ||
      quoteRequest.estimateMinCents === null ||
      quoteRequest.estimateMaxCents === null
    ) {
      throw new CompanyProposalValidationError(
        "Quote request needs a calculated estimate before proposal creation.",
      );
    }

    const existingProposal =
      await this.dependencies.proposalRepository.findProposalByQuoteRequest({
        companyId: account.companyId,
        quoteRequestId,
      });

    this.assertNoAcceptedVersion(existingProposal);

    const now = this.now();
    const validUntil = input.validUntil
      ? new Date(input.validUntil)
      : addDays(now, APP_DEFAULTS.quoteValidityDays);

    try {
      assertProposalValidityDate({ now, validUntil });
    } catch (error) {
      throw this.toLifecycleError(error);
    }

    const totals = this.prepareFinalTotal({
      internalTotalCents: quoteRequest.internalTotalCents,
      estimateMinCents: quoteRequest.estimateMinCents,
      estimateMaxCents: quoteRequest.estimateMaxCents,
      ...(input.finalTotalCents !== undefined
        ? { finalTotalCents: input.finalTotalCents }
        : {}),
      ...(input.outOfRangeReason !== undefined
        ? { outOfRangeReason: input.outOfRangeReason }
        : {}),
    });
    const versionNumber = getNextVersionNumber(existingProposal);
    const quoteId = existingProposal?.id ?? randomUUID();
    const versionId = randomUUID();
    const proposalCode = createProposalCode(quoteRequest.requestCode, versionNumber, now);
    const terms = input.terms?.trim() || null;
    const termsVersion = input.termsVersion?.trim() || "draft-v1";
    const snapshot = createProposalSnapshot({
      quoteRequest,
      estimate,
      versionNumber,
      proposalCode,
      finalTotalCents: totals.finalTotalCents,
      outOfRangeReason: totals.outOfRangeReason,
      validUntil,
      termsVersion,
      now,
    });

    const proposal = await this.dependencies.proposalRepository.createVersion({
      quoteId,
      quoteRequestId,
      companyId: account.companyId,
      actorUserId: userId,
      versionId,
      versionNumber,
      proposalCode,
      internalTotalCents: quoteRequest.internalTotalCents,
      estimateMinCents: quoteRequest.estimateMinCents,
      estimateMaxCents: quoteRequest.estimateMaxCents,
      finalTotalCents: totals.finalTotalCents,
      outOfRangeReason: totals.outOfRangeReason,
      validUntil,
      terms,
      termsVersion,
      snapshot,
      items: estimate.itemEstimates.map((item, index) => ({
        id: randomUUID(),
        itemId: item.itemId,
        label: item.label,
        quantity: item.quantity,
        internalTotalCents: item.internalTotalCents,
        finalTotalCents: item.internalTotalCents,
        snapshot: {
          item,
          requestItem:
            quoteRequest.data.items.find((candidate) => candidate.id === item.itemId) ??
            null,
        },
        displayOrder: index,
      })),
      now,
      hasExistingQuote: Boolean(existingProposal),
    });

    return {
      proposal,
    };
  }

  async sendProposal(
    userId: string,
    quoteId: string,
    idempotencyKey: string | undefined,
  ): Promise<CompanyProposalDetailResponse> {
    const account = await this.getActiveCompanyAccount(userId);

    if (!idempotencyKey) {
      throw new CompanyProposalIdempotencyRequiredError();
    }

    try {
      parseIdempotencyKey(idempotencyKey);
    } catch {
      throw new CompanyProposalIdempotencyRequiredError();
    }

    const proposal = await this.findProposal(account.companyId, quoteId);
    this.assertNoAcceptedVersion(proposal);
    const version = getLatestVersion(proposal);

    if (!version) {
      throw new CompanyProposalLifecycleApiError(
        "Proposal must have a version before it can be sent.",
        "COMPANY_PROPOSAL_VERSION_NOT_SENDABLE",
      );
    }

    const now = this.now();

    try {
      assertProposalValidityDate({
        now,
        validUntil: new Date(version.validUntil),
      });
    } catch (error) {
      throw this.toLifecycleError(error);
    }

    const scope = `proposal_send:${proposal.id}`;
    const requestHash = hashJson({
      quoteId: proposal.id,
      quoteVersionId: version.id,
      versionNumber: version.versionNumber,
      finalTotalCents: version.finalTotalCents,
      validUntil: version.validUntil,
    });
    const existing = await this.dependencies.proposalRepository.findSendIdempotencyRecord(
      {
        scope,
        key: idempotencyKey,
      },
    );

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new CompanyProposalIdempotencyConflictError();
      }

      return {
        proposal: await this.findProposal(
          account.companyId,
          existing.responseBody.quoteId,
        ),
      };
    }

    if (version.status !== "draft") {
      throw new CompanyProposalLifecycleApiError(
        "Only the latest draft proposal version can be sent.",
        "COMPANY_PROPOSAL_VERSION_NOT_SENDABLE",
      );
    }

    let toStatus: CompanyProposalVersion["status"];

    try {
      toStatus = transitionProposalVersionStatus(version.status, "send");
    } catch (error) {
      throw this.toLifecycleError(error);
    }

    const sent = await this.dependencies.proposalRepository.sendVersion({
      quoteId: proposal.id,
      quoteVersionId: version.id,
      companyId: account.companyId,
      actorUserId: userId,
      fromStatus: version.status,
      toStatus,
      quoteStatus: "sent",
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
      now,
    });

    return {
      proposal: sent,
    };
  }

  private async getActiveCompanyAccount(
    userId: string,
  ): Promise<PersistedCompanyAccountStatus> {
    const account =
      await this.dependencies.accountRepository.findCompanyAccountByUserId(userId);

    if (!account || account.status !== "active") {
      throw new CompanyProposalAccessDeniedError();
    }

    if (!["owner", "manager", "operator"].includes(account.memberRole)) {
      throw new CompanyProposalAccessDeniedError();
    }

    return account;
  }

  private async findQuoteRequest(companyId: string, quoteRequestId: string) {
    const quoteRequest =
      await this.dependencies.quoteRequestRepository.findQuoteRequestByCompanyAndId({
        companyId,
        quoteRequestId,
      });

    if (!quoteRequest) {
      throw new CompanyProposalNotFoundError();
    }

    return quoteRequest;
  }

  private async findProposal(companyId: string, quoteId: string) {
    const proposal =
      await this.dependencies.proposalRepository.findProposalByCompanyAndId({
        companyId,
        quoteId,
      });

    if (!proposal) {
      throw new CompanyProposalNotFoundError();
    }

    return proposal;
  }

  private assertNoAcceptedVersion(proposal: PersistedCompanyProposal | null) {
    try {
      assertCanCreateProposalVersion({
        existingAcceptedVersion: Boolean(
          proposal?.acceptedQuoteVersionId ||
          proposal?.versions.some((version) => version.status === "accepted"),
        ),
      });
    } catch (error) {
      throw this.toLifecycleError(error);
    }
  }

  private prepareFinalTotal(input: Parameters<typeof prepareProposalFinalTotal>[0]) {
    try {
      return prepareProposalFinalTotal(input);
    } catch (error) {
      if (error instanceof ProposalLifecycleError) {
        throw new CompanyProposalValidationError(
          error.message,
          toCompanyProposalErrorCode(error.code),
        );
      }

      throw error;
    }
  }

  private toLifecycleError(error: unknown) {
    if (error instanceof ProposalLifecycleError) {
      return new CompanyProposalLifecycleApiError(
        error.message,
        toCompanyProposalErrorCode(error.code),
      );
    }

    return error;
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
}

function getNextVersionNumber(proposal: PersistedCompanyProposal | null) {
  const latest = getLatestVersion(proposal);

  return latest ? latest.versionNumber + 1 : 1;
}

function getLatestVersion(proposal: PersistedCompanyProposal | null) {
  return proposal?.versions
    .slice()
    .sort((left, right) => right.versionNumber - left.versionNumber)[0];
}

function createProposalSnapshot(input: {
  quoteRequest: PersistedCompanyQuoteRequest;
  estimate: NonNullable<ReturnType<typeof estimateFromCalculationSnapshot>>;
  versionNumber: number;
  proposalCode: string;
  finalTotalCents: number;
  outOfRangeReason: string | null;
  validUntil: Date;
  termsVersion: string;
  now: Date;
}) {
  return {
    quoteRequest: {
      id: input.quoteRequest.id,
      requestCode: input.quoteRequest.requestCode,
      companyId: input.quoteRequest.companyId,
      companyConfigurationId: input.quoteRequest.companyConfigurationId,
      companyServiceId: input.quoteRequest.companyServiceId,
      companyPricingVersionId: input.quoteRequest.companyPricingVersionId,
      status: input.quoteRequest.status,
      submittedAt: input.quoteRequest.submittedAt,
      data: input.quoteRequest.data,
      calculationSnapshot: input.quoteRequest.calculationSnapshot,
    },
    estimate: input.estimate,
    proposal: {
      versionNumber: input.versionNumber,
      proposalCode: input.proposalCode,
      internalTotalCents: input.quoteRequest.internalTotalCents,
      estimateMinCents: input.quoteRequest.estimateMinCents,
      estimateMaxCents: input.quoteRequest.estimateMaxCents,
      finalTotalCents: input.finalTotalCents,
      outOfRangeReason: input.outOfRangeReason,
      validUntil: input.validUntil.toISOString(),
      termsVersion: input.termsVersion,
      createdAt: input.now.toISOString(),
    },
  };
}

function createProposalCode(
  requestCode: string | null,
  versionNumber: number,
  now: Date,
) {
  const fallbackCode = `${now.getUTCFullYear()}-${randomUUID().slice(0, 8)}`;
  const sourceCode = requestCode || fallbackCode;
  const baseCode = sourceCode.replace(/^SOL-/i, "").replace(/^VEL-/i, "");
  const safeBaseCode = baseCode
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();

  return `ORC-${safeBaseCode || fallbackCode.toUpperCase()}-V${versionNumber}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toCompanyProposalErrorCode(code: string) {
  return code.startsWith("PROPOSAL_") ? `COMPANY_${code}` : `COMPANY_PROPOSAL_${code}`;
}
