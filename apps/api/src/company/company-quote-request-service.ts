import { randomUUID } from "node:crypto";
import {
  QuoteRequestLifecycleError,
  transitionQuoteRequestStatus,
} from "@velaris/domain";
import {
  quoteDraftDataSchema,
  type CompanyQuoteDashboard,
  type CompanyQuoteRequestDeclineRequest,
  type CompanyQuoteRequestDetail,
  type CompanyQuoteRequestDetailResponse,
  type CompanyQuoteRequestListQuery,
  type CompanyQuoteRequestReviewRequest,
  type CompanyQuoteRequestSummary,
  type CompanyQuoteRequestsListResponse,
  type QuoteDraftData,
} from "@velaris/shared";
import {
  QuoteDraftCalculationError,
  calculateQuoteDraftData,
  estimateFromCalculationSnapshot,
} from "../quote-requests/quote-request-calculation.js";
import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "./company-account-repository.js";
import {
  CompanyQuoteAccessDeniedError,
  CompanyQuoteCalculationError,
  CompanyQuoteRequestNotFoundError,
  CompanyQuoteReviewValidationError,
  CompanyQuoteTransitionError,
} from "./company-quote-errors.js";
import type {
  CompanyQuoteRequestAnswerInput,
  CompanyQuoteRequestRepository,
  CompanyQuoteRequestRevisionInput,
  PersistedCompanyQuoteRequest,
} from "./company-quote-request-repository.js";
import type { TemplateRepository } from "../templates/template-repository.js";

interface CompanyQuoteRequestServiceDependencies {
  accountRepository: CompanyAccountRepository;
  quoteRequestRepository: CompanyQuoteRequestRepository;
  templateRepository: TemplateRepository;
  now?: () => Date;
}

export class CompanyQuoteRequestService {
  constructor(private readonly dependencies: CompanyQuoteRequestServiceDependencies) {}

  async listQuoteRequests(
    userId: string,
    query: CompanyQuoteRequestListQuery,
  ): Promise<CompanyQuoteRequestsListResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const allRequests = await this.dependencies.quoteRequestRepository.listQuoteRequests({
      companyId: account.companyId,
    });
    const quoteRequests = query.status
      ? allRequests.filter((request) => request.status === query.status)
      : allRequests;

    return {
      dashboard: createDashboard(allRequests),
      quoteRequests: quoteRequests.map(toSummary),
    };
  }

  async getQuoteRequest(
    userId: string,
    quoteRequestId: string,
  ): Promise<CompanyQuoteRequestDetailResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const quoteRequest = await this.findQuoteRequest(account.companyId, quoteRequestId);

    return {
      quoteRequest: await this.toDetail(quoteRequest),
    };
  }

  async reviewQuoteRequest(
    userId: string,
    quoteRequestId: string,
    input: CompanyQuoteRequestReviewRequest,
  ): Promise<CompanyQuoteRequestDetailResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const quoteRequest = await this.findQuoteRequest(account.companyId, quoteRequestId);

    if (input.action === "open_review") {
      return this.transitionQuoteRequest({
        quoteRequest,
        actorUserId: userId,
        action: "open_review",
        eventType: "quote_request.review_opened",
        metadata: {},
      });
    }

    if (input.action === "accept_for_proposal") {
      return this.transitionQuoteRequest({
        quoteRequest,
        actorUserId: userId,
        action: "accept_for_proposal",
        eventType: "quote_request.accepted_for_proposal",
        metadata: {},
      });
    }

    if (quoteRequest.status !== "under_review") {
      throw new CompanyQuoteTransitionError(
        "Quote request must be under review before saving technical changes.",
      );
    }

    if (!input.data) {
      throw new CompanyQuoteReviewValidationError("Review data is required.");
    }

    const data = quoteDraftDataSchema.parse({
      ...input.data,
      currentStep: "review",
    });
    const changes = diffQuoteDraftData(quoteRequest.data, data);
    const reason = input.reason?.trim() ?? "";

    if (changes.length > 0 && !reason) {
      throw new CompanyQuoteReviewValidationError(
        "Reason is required when technical fields are changed.",
      );
    }

    const { configuration, service } = await this.loadConfigurationService(quoteRequest);
    const calculatedAt = this.now();
    const { calculation, summary } = this.calculateReview({
      configuration,
      service,
      data,
      calculatedAt,
    });
    const previousTotalCents = quoteRequest.internalTotalCents ?? 0;
    const impactCents = calculation.internalTotalCents - previousTotalCents;
    const revisions = changes.map((change, index): CompanyQuoteRequestRevisionInput => ({
      id: randomUUID(),
      itemId: change.itemId,
      fieldCode: change.fieldCode,
      originalValue: toRevisionJsonValue(change.originalValue),
      revisedValue: toRevisionJsonValue(change.revisedValue),
      reason: reason || null,
      impactCents: index === 0 ? impactCents : 0,
      configurationVersion: configuration.version,
      pricingVersion: configuration.pricingVersion?.version ?? 1,
      actorUserId: userId,
    }));
    const saved = await this.dependencies.quoteRequestRepository.saveReview({
      quoteRequestId: quoteRequest.id,
      companyId: quoteRequest.companyId,
      actorUserId: userId,
      data,
      answers: createAnswerRows(data),
      revisions,
      calculationSnapshot: {
        ...calculation.snapshot,
        summary,
      },
      internalTotalCents: calculation.internalTotalCents,
      estimateMinCents: calculation.estimateMinCents,
      estimateMaxCents: calculation.estimateMaxCents,
      eventMetadata: {
        reason: reason || null,
        changedFields: changes.map((change) => ({
          itemId: change.itemId,
          fieldCode: change.fieldCode,
        })),
        previousTotalCents,
        internalTotalCents: calculation.internalTotalCents,
        impactCents,
      },
      now: calculatedAt,
    });

    return {
      quoteRequest: await this.toDetail(saved),
    };
  }

  async declineQuoteRequest(
    userId: string,
    quoteRequestId: string,
    input: CompanyQuoteRequestDeclineRequest,
  ): Promise<CompanyQuoteRequestDetailResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const quoteRequest = await this.findQuoteRequest(account.companyId, quoteRequestId);

    return this.transitionQuoteRequest({
      quoteRequest,
      actorUserId: userId,
      action: "decline",
      eventType: "quote_request.declined_by_company",
      metadata: {
        reasonCode: input.reasonCode,
        reason: input.reason,
      },
    });
  }

  private async transitionQuoteRequest(input: {
    quoteRequest: PersistedCompanyQuoteRequest;
    actorUserId: string;
    action: "open_review" | "accept_for_proposal" | "decline";
    eventType: string;
    metadata: Record<string, unknown>;
  }): Promise<CompanyQuoteRequestDetailResponse> {
    let toStatus: PersistedCompanyQuoteRequest["status"];

    try {
      toStatus = transitionQuoteRequestStatus(input.quoteRequest.status, input.action);
    } catch (error) {
      if (error instanceof QuoteRequestLifecycleError) {
        throw new CompanyQuoteTransitionError(error.message);
      }

      throw error;
    }

    const transitioned = await this.dependencies.quoteRequestRepository.transitionStatus({
      quoteRequestId: input.quoteRequest.id,
      companyId: input.quoteRequest.companyId,
      actorUserId: input.actorUserId,
      fromStatus: input.quoteRequest.status,
      toStatus,
      eventType: input.eventType,
      metadata: input.metadata,
      now: this.now(),
    });

    return {
      quoteRequest: await this.toDetail(transitioned),
    };
  }

  private async getActiveCompanyAccount(
    userId: string,
  ): Promise<PersistedCompanyAccountStatus> {
    const account =
      await this.dependencies.accountRepository.findCompanyAccountByUserId(userId);

    if (!account || account.status !== "active") {
      throw new CompanyQuoteAccessDeniedError();
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
      throw new CompanyQuoteRequestNotFoundError();
    }

    return quoteRequest;
  }

  private async toDetail(
    quoteRequest: PersistedCompanyQuoteRequest,
  ): Promise<CompanyQuoteRequestDetail> {
    const { configuration, service } = await this.loadConfigurationService(quoteRequest);

    return {
      ...toSummary(quoteRequest),
      companyId: quoteRequest.companyId,
      service: {
        id: service.id,
        code: service.code,
        name: service.name,
        schedulingMode: service.schedulingMode,
        estimateMarginLowerBps: service.estimateMarginLowerBps,
        estimateMarginUpperBps: service.estimateMarginUpperBps,
        fields: service.fields.filter((field) => field.isActive),
      },
      data: quoteRequest.data,
      files: quoteRequest.files,
      estimate: estimateFromCalculationSnapshot(quoteRequest.calculationSnapshot),
      calculationSnapshot: quoteRequest.calculationSnapshot,
      configurationVersion: configuration.version,
      pricingVersion: configuration.pricingVersion?.version ?? 1,
      revisions: quoteRequest.revisions,
      events: quoteRequest.events,
    };
  }

  private async loadConfigurationService(quoteRequest: PersistedCompanyQuoteRequest) {
    const configuration =
      await this.dependencies.templateRepository.findCompanyConfigurationById(
        quoteRequest.companyConfigurationId,
      );

    if (!configuration || configuration.companyId !== quoteRequest.companyId) {
      throw new CompanyQuoteRequestNotFoundError();
    }

    const service = configuration.services.find(
      (candidate) => candidate.id === quoteRequest.companyServiceId,
    );

    if (!service) {
      throw new CompanyQuoteRequestNotFoundError();
    }

    return {
      configuration,
      service,
    };
  }

  private calculateReview(input: Parameters<typeof calculateQuoteDraftData>[0]) {
    try {
      return calculateQuoteDraftData(input);
    } catch (error) {
      if (error instanceof QuoteDraftCalculationError) {
        throw new CompanyQuoteCalculationError(error.code, error.message);
      }

      throw error;
    }
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
}

function toSummary(
  quoteRequest: PersistedCompanyQuoteRequest,
): CompanyQuoteRequestSummary {
  return {
    id: quoteRequest.id,
    requestCode: quoteRequest.requestCode,
    status: quoteRequest.status,
    serviceName: quoteRequest.serviceName,
    customerName: quoteRequest.data.contact.name || "Cliente sem nome",
    customerWhatsapp: quoteRequest.data.contact.whatsapp || "Nao informado",
    itemCount: quoteRequest.data.items.reduce((total, item) => total + item.quantity, 0),
    internalTotalCents: quoteRequest.internalTotalCents,
    estimateMinCents: quoteRequest.estimateMinCents,
    estimateMaxCents: quoteRequest.estimateMaxCents,
    submittedAt: quoteRequest.submittedAt,
    updatedAt: quoteRequest.updatedAt,
  };
}

function createDashboard(
  quoteRequests: PersistedCompanyQuoteRequest[],
): CompanyQuoteDashboard {
  const respondedRequests = quoteRequests.filter(
    (request) =>
      request.submittedAt &&
      (request.status === "accepted_for_proposal" ||
        request.status === "declined_by_company"),
  );
  const responseMinutes = respondedRequests.map((request) =>
    Math.max(
      0,
      Math.round(
        (new Date(request.updatedAt).getTime() -
          new Date(request.submittedAt ?? request.updatedAt).getTime()) /
          60000,
      ),
    ),
  );

  return {
    receivedCount: quoteRequests.length,
    submittedCount: quoteRequests.filter((request) => request.status === "submitted")
      .length,
    underReviewCount: quoteRequests.filter((request) => request.status === "under_review")
      .length,
    acceptedForProposalCount: quoteRequests.filter(
      (request) => request.status === "accepted_for_proposal",
    ).length,
    declinedCount: quoteRequests.filter(
      (request) => request.status === "declined_by_company",
    ).length,
    averageResponseMinutes:
      responseMinutes.length === 0
        ? null
        : Math.round(
            responseMinutes.reduce((total, value) => total + value, 0) /
              responseMinutes.length,
          ),
  };
}

interface QuoteDraftChange {
  itemId: string | null;
  fieldCode: string;
  originalValue: unknown;
  revisedValue: unknown;
}

function diffQuoteDraftData(
  current: QuoteDraftData,
  revised: QuoteDraftData,
): QuoteDraftChange[] {
  const changes: QuoteDraftChange[] = [];
  const revisedItemsById = new Map(revised.items.map((item) => [item.id, item]));

  for (const currentItem of current.items) {
    const revisedItem = revisedItemsById.get(currentItem.id);

    if (!revisedItem) {
      changes.push({
        itemId: currentItem.id,
        fieldCode: "item_removed",
        originalValue: currentItem,
        revisedValue: null,
      });
      continue;
    }

    for (const field of itemDiffFields) {
      const originalValue = currentItem[field.property];
      const revisedValue = revisedItem[field.property];

      if (!sameValue(originalValue, revisedValue)) {
        changes.push({
          itemId: currentItem.id,
          fieldCode: field.code,
          originalValue,
          revisedValue,
        });
      }
    }
  }

  for (const revisedItem of revised.items) {
    if (!current.items.some((item) => item.id === revisedItem.id)) {
      changes.push({
        itemId: revisedItem.id,
        fieldCode: "item_added",
        originalValue: null,
        revisedValue: revisedItem,
      });
    }
  }

  for (const field of accessDiffFields) {
    const originalValue = current.access[field.property];
    const revisedValue = revised.access[field.property];

    if (!sameValue(originalValue, revisedValue)) {
      changes.push({
        itemId: null,
        fieldCode: field.code,
        originalValue,
        revisedValue,
      });
    }
  }

  return changes;
}

const itemDiffFields = [
  { property: "itemType", code: "item_type" },
  { property: "quantity", code: "quantity" },
  { property: "size", code: "size" },
  { property: "seats", code: "seats" },
  { property: "fabricType", code: "fabric_type" },
  { property: "dirtLevel", code: "dirt_level" },
  { property: "hasStains", code: "has_stains" },
  { property: "stainTypes", code: "stain_type" },
  { property: "odor", code: "odor" },
  { property: "petHair", code: "pet_hair" },
  { property: "petsPresent", code: "pets_present" },
  { property: "waterproofing", code: "waterproofing" },
] as const satisfies Array<{
  property: keyof QuoteDraftData["items"][number];
  code: string;
}>;

const accessDiffFields = [
  { property: "urgency", code: "urgency" },
  { property: "floor", code: "floor" },
  { property: "hasElevator", code: "has_elevator" },
  { property: "parking", code: "parking" },
  { property: "distanceKm", code: "distance_km" },
] as const satisfies Array<{
  property: keyof QuoteDraftData["access"];
  code: string;
}>;

function createAnswerRows(data: QuoteDraftData): CompanyQuoteRequestAnswerInput[] {
  const answers: CompanyQuoteRequestAnswerInput[] = [];

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
): CompanyQuoteRequestAnswerInput {
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
): CompanyQuoteRequestAnswerInput {
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

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toRevisionJsonValue(value: unknown) {
  return value === null ? { value: null } : value;
}
