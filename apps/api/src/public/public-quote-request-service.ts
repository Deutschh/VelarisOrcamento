import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  CalculationError,
  QuoteRequestLifecycleError,
  assertDraftQuoteRequest,
  calculateQuoteRequestEstimate,
  parseIdempotencyKey,
  type CalculationAnswers,
  type CalculationPricingRule,
} from "@velaris/domain";
import {
  quoteDraftDataSchema,
  type CreateQuoteDraftRequest,
  type CreateQuoteDraftResponse,
  type QuoteDraftData,
  type QuoteDraftDetail,
  type QuoteDraftFileMetadataRequest,
  type QuoteDraftResponse,
  type QuoteEstimateResponse,
  type QuoteEstimateSummary,
  type QuoteItemEstimateSummary,
  type QuoteSubmitResponse,
  type SubmitQuoteDraftRequest,
  type UpdateQuoteDraftRequest,
  type CompanyConfigurationDetail,
  type CompanyServiceConfiguration,
  type PricingRuleConfiguration,
} from "@velaris/shared";
import { hashToken } from "../auth/token-service.js";
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

interface PublicQuoteRequestServiceDependencies {
  publicCompanyRepository: PublicCompanyRepository;
  templateRepository: TemplateRepository;
  quoteRequestRepository: PublicQuoteRequestRepository;
  emailAdapter?: EmailAdapter;
  draftExpirationDays?: number;
  now?: () => Date;
}

interface DraftContext {
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

    validateSubmissionData(context.request.data);

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

    await this.dependencies.emailAdapter?.sendQuoteRequestConfirmation?.({
      to: context.request.data.contact.email,
      name: context.request.data.contact.name,
      companyName: context.company.tradingName,
      requestCode,
      trackingPath: responseBody.trackingPath,
    });

    return responseBody;
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

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }

  private draftExpirationDays() {
    return this.dependencies.draftExpirationDays ?? env.DRAFT_EXPIRATION_DAYS;
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

function validateSubmissionData(data: QuoteDraftData) {
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

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
