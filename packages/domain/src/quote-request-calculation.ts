import {
  calculateEstimate,
  type CalculationAnswers,
  type CalculationLine,
  type CalculationPricingRule,
  type CalculationResult,
} from "./calculation-engine.js";

export interface QuoteRequestCalculationItem {
  id: string;
  label: string;
  quantity: number;
  answers: CalculationAnswers;
}

export interface QuoteRequestCalculationInput {
  configurationVersion: number;
  pricingVersion: number;
  requestAnswers: CalculationAnswers;
  items: QuoteRequestCalculationItem[];
  rules: CalculationPricingRule[];
  estimateMarginLowerBps: number;
  estimateMarginUpperBps: number;
}

export interface QuoteRequestItemCalculationResult {
  itemId: string;
  label: string;
  quantity: number;
  internalTotalCents: number;
  lines: CalculationLine[];
  result: CalculationResult;
}

export interface QuoteRequestGroupedCalculationResult {
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  itemResults: QuoteRequestItemCalculationResult[];
  requestAdjustments: CalculationLine[];
  finalCalculation: CalculationResult;
  snapshot: {
    configurationVersion: number;
    pricingVersion: number;
    requestAnswers: CalculationAnswers;
    items: Array<{
      id: string;
      label: string;
      quantity: number;
      answers: CalculationAnswers;
      result: CalculationResult["snapshot"];
    }>;
    requestRules: CalculationPricingRule[];
    result: CalculationResult["snapshot"]["result"];
  };
}

const requestLevelRuleCodes = new Set([
  "access_no_elevator_floor_addition",
  "access_no_parking_addition",
  "distance_fee",
  "minimum_visit",
  "quantity_discount",
  "rounding_nearest_5",
  "urgency_addition",
]);

const requestLevelFieldCodes = new Set([
  "distance_km",
  "floor",
  "has_elevator",
  "parking",
  "urgency",
]);

export function calculateQuoteRequestEstimate(
  input: QuoteRequestCalculationInput,
): QuoteRequestGroupedCalculationResult {
  const itemRules = input.rules.filter((rule) => !isRequestLevelRule(rule));
  const requestRules = input.rules.filter(isRequestLevelRule);
  const itemResults = input.items.map((item) => calculateItem(input, item, itemRules));
  const itemsSubtotalCents = itemResults.reduce(
    (total, item) => total + item.internalTotalCents,
    0,
  );
  const totalQuantity = input.items.reduce((total, item) => total + item.quantity, 0);
  const finalCalculation = calculateEstimate({
    configurationVersion: input.configurationVersion,
    pricingVersion: input.pricingVersion,
    answers: {
      ...input.requestAnswers,
      quantity: totalQuantity,
    },
    rules: [
      createItemsSubtotalRule(itemsSubtotalCents),
      ...requestRules.map((rule) => ({
        ...rule,
        displayOrder: rule.displayOrder + 10,
      })),
    ],
    estimateMarginLowerBps: input.estimateMarginLowerBps,
    estimateMarginUpperBps: input.estimateMarginUpperBps,
    allowZeroTotal: false,
  });

  return {
    internalTotalCents: finalCalculation.internalTotalCents,
    estimateMinCents: finalCalculation.estimateMinCents,
    estimateMaxCents: finalCalculation.estimateMaxCents,
    itemResults,
    requestAdjustments: finalCalculation.adjustments,
    finalCalculation,
    snapshot: {
      configurationVersion: input.configurationVersion,
      pricingVersion: input.pricingVersion,
      requestAnswers: input.requestAnswers,
      items: itemResults.map((item) => ({
        id: item.itemId,
        label: item.label,
        quantity: item.quantity,
        answers: item.result.snapshot.answers,
        result: item.result.snapshot,
      })),
      requestRules,
      result: finalCalculation.snapshot.result,
    },
  };
}

function calculateItem(
  input: QuoteRequestCalculationInput,
  item: QuoteRequestCalculationItem,
  itemRules: CalculationPricingRule[],
): QuoteRequestItemCalculationResult {
  const result = calculateEstimate({
    configurationVersion: input.configurationVersion,
    pricingVersion: input.pricingVersion,
    answers: item.answers,
    rules: itemRules,
    estimateMarginLowerBps: 0,
    estimateMarginUpperBps: 0,
    allowZeroTotal: false,
  });

  return {
    itemId: item.id,
    label: item.label,
    quantity: item.quantity,
    internalTotalCents: result.internalTotalCents,
    lines: result.memory,
    result,
  };
}

function isRequestLevelRule(rule: CalculationPricingRule) {
  return (
    requestLevelRuleCodes.has(rule.code) ||
    rule.ruleType === "distance_fee" ||
    rule.ruleType === "minimum_value" ||
    rule.ruleType === "rounding" ||
    rule.ruleType === "administrative_discount" ||
    isRequestLevelField(rule.targetFieldCode) ||
    isRequestLevelField(rule.quantityFieldCode) ||
    isRequestLevelField(rule.condition?.sourceFieldCode ?? null)
  );
}

function isRequestLevelField(fieldCode: string | null) {
  return fieldCode !== null && requestLevelFieldCodes.has(fieldCode);
}

function createItemsSubtotalRule(amountCents: number): CalculationPricingRule {
  return {
    id: "quote-items-subtotal",
    templatePricingRuleId: null,
    code: "quote_items_subtotal",
    label: "Subtotal dos itens",
    ruleType: "fixed_price",
    targetFieldCode: null,
    targetOptionCode: null,
    quantityFieldCode: null,
    amountCents,
    percentageBps: null,
    multiplierBps: null,
    minimumValue: null,
    maximumValue: null,
    unit: "unit",
    condition: null,
    roundingMode: null,
    roundingIncrementCents: null,
    isActive: true,
    displayOrder: -1000,
  };
}
