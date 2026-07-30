import {
  CalculationError,
  calculateQuoteRequestEstimate,
  type CalculationAnswers,
  type CalculationPricingRule,
} from "@velaris/domain";
import type {
  CompanyConfigurationDetail,
  CompanyServiceConfiguration,
  PricingRuleConfiguration,
  QuoteDraftData,
  QuoteEstimateSummary,
  QuoteItemEstimateSummary,
} from "@velaris/shared";

export interface QuoteDraftCalculationOutput {
  calculation: ReturnType<typeof calculateQuoteRequestEstimate>;
  summary: QuoteEstimateSummary;
}

export class QuoteDraftCalculationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "QuoteDraftCalculationError";
  }
}

export function calculateQuoteDraftData(input: {
  configuration: CompanyConfigurationDetail;
  service: CompanyServiceConfiguration;
  data: QuoteDraftData;
  calculatedAt: Date;
}): QuoteDraftCalculationOutput {
  try {
    const calculation = calculateQuoteRequestEstimate({
      configurationVersion: input.configuration.version,
      pricingVersion: input.configuration.pricingVersion?.version ?? 1,
      requestAnswers: createRequestAnswers(input.data),
      items: input.data.items.map((item, index) => ({
        id: item.id,
        label: item.label || `Item ${index + 1}`,
        quantity: item.quantity,
        answers: createItemAnswers(item),
      })),
      rules: input.service.pricingRules.map(toCalculationRule),
      estimateMarginLowerBps: input.service.estimateMarginLowerBps,
      estimateMarginUpperBps: input.service.estimateMarginUpperBps,
    });

    return {
      calculation,
      summary: createEstimateSummary(calculation, input.calculatedAt),
    };
  } catch (error) {
    if (error instanceof CalculationError) {
      throw new QuoteDraftCalculationError(error.message, error.code);
    }

    throw error;
  }
}

export function estimateFromCalculationSnapshot(
  snapshot: Record<string, unknown> | null,
): QuoteEstimateSummary | null {
  const candidate = snapshot?.summary;

  if (!isEstimateSummary(candidate)) {
    return null;
  }

  return candidate;
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
