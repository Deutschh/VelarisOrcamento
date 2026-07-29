import type { MoneyCents } from "./money.js";
import { createMoneyCents } from "./money.js";

export type CalculationRuleType =
  | "fixed_price"
  | "quantity"
  | "area"
  | "linear_meter"
  | "multiplier"
  | "fixed_addition"
  | "percentage_addition"
  | "minimum_value"
  | "minimum_area"
  | "price_range"
  | "option_price"
  | "distance_fee"
  | "administrative_discount"
  | "rounding";

export type CalculationRuleUnit = "unit" | "m" | "m2" | "linear_m" | "km";

export type CalculationRoundingMode = "nearest" | "up" | "down";

export interface CalculationCondition {
  sourceFieldCode: string;
  operator: "equals" | "not_equals" | "includes";
  value: string | number | boolean | string[] | number[];
}

export interface CalculationMeasurementAnswer {
  originalValue: number | string;
  originalUnit: "mm" | "cm" | "m" | "m2" | "km" | "unit";
  normalizedValue: number | string;
  normalizedUnit: CalculationRuleUnit;
}

export type CalculationAnswerValue =
  string | number | boolean | string[] | number[] | CalculationMeasurementAnswer;

export type CalculationAnswers = Record<string, CalculationAnswerValue>;

export interface CalculationPricingRule {
  id: string;
  templatePricingRuleId: string | null;
  code: string;
  label: string;
  ruleType: CalculationRuleType;
  targetFieldCode: string | null;
  targetOptionCode: string | null;
  quantityFieldCode: string | null;
  amountCents: number | null;
  percentageBps: number | null;
  multiplierBps: number | null;
  minimumValue: string | null;
  maximumValue: string | null;
  unit: CalculationRuleUnit | null;
  condition: CalculationCondition | null;
  roundingMode: CalculationRoundingMode | null;
  roundingIncrementCents: number | null;
  isActive: boolean;
  displayOrder: number;
}

export interface CalculationInput {
  configurationVersion: number;
  pricingVersion: number;
  answers: CalculationAnswers;
  rules: CalculationPricingRule[];
  estimateMarginLowerBps: number;
  estimateMarginUpperBps: number;
  finalAmountCents?: number;
  finalAmountJustification?: string;
  allowZeroTotal?: boolean;
}

export interface CalculationLine {
  id: string;
  ruleId: string;
  ruleCode: string;
  label: string;
  amountCents: MoneyCents;
  explanation: string;
}

export interface CalculationResult {
  baseAmountCents: MoneyCents;
  items: CalculationLine[];
  adjustments: CalculationLine[];
  internalTotalCents: MoneyCents;
  estimateMinCents: MoneyCents;
  estimateMaxCents: MoneyCents;
  configurationVersion: number;
  pricingVersion: number;
  finalAmountCents: MoneyCents;
  finalAmountRequiresJustification: boolean;
  memory: CalculationLine[];
  snapshot: {
    configurationVersion: number;
    pricingVersion: number;
    answers: CalculationAnswers;
    rules: CalculationPricingRule[];
    result: {
      baseAmountCents: MoneyCents;
      internalTotalCents: MoneyCents;
      estimateMinCents: MoneyCents;
      estimateMaxCents: MoneyCents;
      finalAmountCents: MoneyCents;
    };
  };
}

export class CalculationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CalculationError";
  }
}

export function calculateEstimate(input: CalculationInput): CalculationResult {
  const sortedRules = input.rules
    .filter((rule) => rule.isActive)
    .sort((left, right) =>
      left.displayOrder === right.displayOrder
        ? left.code.localeCompare(right.code)
        : left.displayOrder - right.displayOrder,
    );
  const items: CalculationLine[] = [];
  const adjustments: CalculationLine[] = [];

  for (const rule of sortedRules) {
    if (!matchesCondition(rule.condition, input.answers)) {
      continue;
    }

    const currentTotal = sumLines(items) + sumLines(adjustments);
    const line = applyRule(rule, input.answers, currentTotal);

    if (!line || line.amountCents === 0) {
      continue;
    }

    if (isBaseRule(rule.ruleType)) {
      items.push(line);
    } else {
      adjustments.push(line);
    }
  }

  const baseAmountCents = createMoneyCents(sumLines(items));
  const internalTotalCents = createMoneyCents(baseAmountCents + sumLines(adjustments));

  if (internalTotalCents < 0) {
    throw new CalculationError(
      "Calculation cannot produce a negative amount.",
      "NEGATIVE_CALCULATION_TOTAL",
    );
  }

  if (internalTotalCents === 0 && input.allowZeroTotal !== true) {
    throw new CalculationError(
      "Calculation produced zero and the service does not allow zero totals.",
      "ZERO_CALCULATION_TOTAL_NOT_ALLOWED",
    );
  }

  const estimateMinCents = createMoneyCents(
    Math.max(
      0,
      internalTotalCents -
        multiplyCentsByBasisPoints(internalTotalCents, input.estimateMarginLowerBps),
    ),
  );
  const estimateMaxCents = createMoneyCents(
    internalTotalCents +
      multiplyCentsByBasisPoints(internalTotalCents, input.estimateMarginUpperBps),
  );
  const finalAmountCents = createMoneyCents(input.finalAmountCents ?? internalTotalCents);
  const finalAmountRequiresJustification =
    finalAmountCents < estimateMinCents || finalAmountCents > estimateMaxCents;

  if (finalAmountRequiresJustification && !input.finalAmountJustification?.trim()) {
    throw new CalculationError(
      "Final amount outside estimate range requires justification.",
      "FINAL_AMOUNT_JUSTIFICATION_REQUIRED",
    );
  }

  const memory = [...items, ...adjustments];

  return {
    baseAmountCents,
    items,
    adjustments,
    internalTotalCents,
    estimateMinCents,
    estimateMaxCents,
    configurationVersion: input.configurationVersion,
    pricingVersion: input.pricingVersion,
    finalAmountCents,
    finalAmountRequiresJustification,
    memory,
    snapshot: {
      configurationVersion: input.configurationVersion,
      pricingVersion: input.pricingVersion,
      answers: input.answers,
      rules: sortedRules,
      result: {
        baseAmountCents,
        internalTotalCents,
        estimateMinCents,
        estimateMaxCents,
        finalAmountCents,
      },
    },
  };
}

function applyRule(
  rule: CalculationPricingRule,
  answers: CalculationAnswers,
  currentTotalCents: number,
): CalculationLine | null {
  const quantityScale = getQuantityScale(rule, answers);
  const amountCents = rule.amountCents ?? 0;

  switch (rule.ruleType) {
    case "fixed_price":
      return createLine(
        rule,
        multiplyCentsByScale(amountCents, quantityScale),
        "Preco fixo aplicado.",
      );
    case "quantity":
      return createLine(
        rule,
        multiplyCentsByScale(
          amountCents,
          multiplyScales(getTargetValueScale(rule, answers, "unit"), quantityScale),
        ),
        "Quantidade multiplicada pelo preco unitario.",
      );
    case "area":
      return createLine(
        rule,
        multiplyCentsByScale(amountCents, getTargetValueScale(rule, answers, "m2")),
        "Area normalizada multiplicada pelo preco por m2.",
      );
    case "linear_meter":
      return createLine(
        rule,
        multiplyCentsByScale(amountCents, getTargetValueScale(rule, answers, "linear_m")),
        "Comprimento normalizado multiplicado pelo preco por metro.",
      );
    case "multiplier":
      return createLine(
        rule,
        multiplyCentsByBasisPoints(
          currentTotalCents,
          (rule.multiplierBps ?? 10000) - 10000,
        ),
        "Multiplicador aplicado sobre o subtotal.",
      );
    case "fixed_addition":
      return matchesTargetRange(rule, answers, rule.unit ?? "unit")
        ? createLine(
            rule,
            multiplyCentsByScale(amountCents, quantityScale),
            "Adicional fixo aplicado.",
          )
        : null;
    case "percentage_addition":
      return createLine(
        rule,
        multiplyCentsByBasisPoints(currentTotalCents, rule.percentageBps ?? 0),
        "Adicional percentual aplicado sobre o subtotal.",
      );
    case "minimum_value":
      return createLine(
        rule,
        Math.max(0, amountCents - currentTotalCents),
        "Complemento ate o valor minimo.",
      );
    case "minimum_area":
      return applyMinimumAreaRule(rule, answers);
    case "price_range":
      return applyPriceRangeRule(rule, answers, quantityScale);
    case "option_price":
      return matchesOption(rule, answers)
        ? createLine(
            rule,
            multiplyCentsByScale(amountCents, quantityScale),
            "Preco por opcao selecionada.",
          )
        : null;
    case "distance_fee":
      return applyDistanceFeeRule(rule, answers);
    case "administrative_discount":
      return matchesTargetRange(rule, answers, rule.unit ?? "unit")
        ? createLine(
            rule,
            -1 *
              (amountCents > 0
                ? amountCents
                : multiplyCentsByBasisPoints(currentTotalCents, rule.percentageBps ?? 0)),
            "Desconto administrativo aplicado.",
          )
        : null;
    case "rounding":
      return createLine(
        rule,
        roundTotal(currentTotalCents, rule) - currentTotalCents,
        "Arredondamento configurado aplicado.",
      );
  }
}

function applyMinimumAreaRule(rule: CalculationPricingRule, answers: CalculationAnswers) {
  const currentArea = getTargetValueScale(rule, answers, "m2");
  const minimumArea = parseDecimalToScale(rule.minimumValue ?? "0");
  const deficit = Math.max(0, minimumArea - currentArea);

  return createLine(
    rule,
    multiplyCentsByScale(rule.amountCents ?? 0, deficit),
    "Complemento de area minima.",
  );
}

function applyPriceRangeRule(
  rule: CalculationPricingRule,
  answers: CalculationAnswers,
  quantityScale: number,
) {
  const target = getTargetValueScale(rule, answers, rule.unit ?? "unit");
  const minimum = rule.minimumValue ? parseDecimalToScale(rule.minimumValue) : null;
  const maximum = rule.maximumValue ? parseDecimalToScale(rule.maximumValue) : null;

  if ((minimum !== null && target < minimum) || (maximum !== null && target > maximum)) {
    return null;
  }

  return createLine(
    rule,
    multiplyCentsByScale(rule.amountCents ?? 0, quantityScale),
    "Preco de faixa aplicado.",
  );
}

function matchesTargetRange(
  rule: CalculationPricingRule,
  answers: CalculationAnswers,
  expectedUnit: CalculationRuleUnit,
) {
  if (!rule.targetFieldCode || (!rule.minimumValue && !rule.maximumValue)) {
    return true;
  }

  const target = getTargetValueScale(rule, answers, expectedUnit);
  const minimum = rule.minimumValue ? parseDecimalToScale(rule.minimumValue) : null;
  const maximum = rule.maximumValue ? parseDecimalToScale(rule.maximumValue) : null;

  return !(
    (minimum !== null && target < minimum) ||
    (maximum !== null && target > maximum)
  );
}

function applyDistanceFeeRule(rule: CalculationPricingRule, answers: CalculationAnswers) {
  const distance = getTargetValueScale(rule, answers, "km");
  const freeDistance = rule.minimumValue ? parseDecimalToScale(rule.minimumValue) : 0;
  const billableDistance = Math.max(0, distance - freeDistance);

  return createLine(
    rule,
    multiplyCentsByScale(rule.amountCents ?? 0, billableDistance),
    "Taxa de deslocamento aplicada por km.",
  );
}

function createLine(
  rule: CalculationPricingRule,
  amountCents: number,
  explanation: string,
): CalculationLine {
  return {
    id: `${rule.id}:${rule.code}`,
    ruleId: rule.id,
    ruleCode: rule.code,
    label: rule.label,
    amountCents: createMoneyCents(amountCents),
    explanation,
  };
}

function matchesCondition(
  condition: CalculationCondition | null,
  answers: CalculationAnswers,
) {
  if (!condition) {
    return true;
  }

  const answer = answers[condition.sourceFieldCode];

  if (isMeasurementAnswer(answer) || answer === undefined) {
    return false;
  }

  if (condition.operator === "equals") {
    return JSON.stringify(answer) === JSON.stringify(condition.value);
  }

  if (condition.operator === "not_equals") {
    return JSON.stringify(answer) !== JSON.stringify(condition.value);
  }

  if (Array.isArray(answer)) {
    const answerValues = answer as Array<string | number>;
    const expectedValues = Array.isArray(condition.value)
      ? (condition.value as Array<string | number>)
      : [condition.value as string | number];

    return expectedValues.every((value) =>
      answerValues.some((answerValue) => answerValue === value),
    );
  }

  if (Array.isArray(condition.value)) {
    return condition.value.some((value) => value === answer);
  }

  return answer === condition.value;
}

function matchesOption(rule: CalculationPricingRule, answers: CalculationAnswers) {
  if (!rule.targetFieldCode || !rule.targetOptionCode) {
    return false;
  }

  const answer = answers[rule.targetFieldCode];

  if (Array.isArray(answer)) {
    return answer.some((value) => value === rule.targetOptionCode);
  }

  return answer === rule.targetOptionCode;
}

function getQuantityScale(rule: CalculationPricingRule, answers: CalculationAnswers) {
  if (!rule.quantityFieldCode) {
    return SCALE;
  }

  return getAnswerScale(answers[rule.quantityFieldCode], "unit");
}

function getTargetValueScale(
  rule: CalculationPricingRule,
  answers: CalculationAnswers,
  expectedUnit: CalculationRuleUnit,
) {
  if (!rule.targetFieldCode) {
    return SCALE;
  }

  return getAnswerScale(answers[rule.targetFieldCode], expectedUnit);
}

function getAnswerScale(
  answer: CalculationAnswerValue | undefined,
  expectedUnit: CalculationRuleUnit,
) {
  if (answer === undefined || typeof answer === "boolean") {
    return 0;
  }

  if (isMeasurementAnswer(answer)) {
    if (answer.normalizedUnit !== expectedUnit) {
      throw new CalculationError(
        `Measurement unit ${answer.normalizedUnit} does not match expected ${expectedUnit}.`,
        "MEASUREMENT_UNIT_MISMATCH",
      );
    }

    return parseDecimalToScale(answer.normalizedValue);
  }

  if (Array.isArray(answer)) {
    return 0;
  }

  if (typeof answer === "string" && Number.isNaN(Number(answer))) {
    return 0;
  }

  return parseDecimalToScale(answer);
}

function isMeasurementAnswer(
  value: CalculationAnswerValue | undefined,
): value is CalculationMeasurementAnswer {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "normalizedValue" in value &&
    "normalizedUnit" in value
  );
}

function isBaseRule(ruleType: CalculationRuleType) {
  return (
    ruleType === "fixed_price" ||
    ruleType === "quantity" ||
    ruleType === "area" ||
    ruleType === "linear_meter" ||
    ruleType === "price_range" ||
    ruleType === "option_price"
  );
}

function sumLines(lines: CalculationLine[]) {
  return lines.reduce((total, line) => total + line.amountCents, 0);
}

const SCALE = 10000;

function parseDecimalToScale(value: number | string) {
  const text = String(value).trim().replace(",", ".");

  if (!/^\d+(\.\d{1,4})?$/.test(text)) {
    throw new CalculationError(
      "Decimal values must be non-negative and have at most four decimal places.",
      "INVALID_DECIMAL_VALUE",
    );
  }

  const [wholePart = "0", decimalPart = ""] = text.split(".");
  return Number(`${wholePart}${decimalPart.padEnd(4, "0")}`);
}

function multiplyCentsByScale(cents: number, scaledValue: number) {
  return divideRounded(cents * scaledValue, SCALE);
}

function multiplyScales(left: number, right: number) {
  return divideRounded(left * right, SCALE);
}

function multiplyCentsByBasisPoints(cents: number, basisPoints: number) {
  return divideRounded(cents * basisPoints, 10000);
}

function divideRounded(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator)) {
    throw new CalculationError(
      "Calculation exceeded safe integer limits.",
      "CALCULATION_INTEGER_OVERFLOW",
    );
  }

  if (numerator >= 0) {
    return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
  }

  return -Math.floor((Math.abs(numerator) + Math.floor(denominator / 2)) / denominator);
}

function roundTotal(totalCents: number, rule: CalculationPricingRule) {
  const increment = rule.roundingIncrementCents ?? 1;

  if (increment <= 1) {
    return totalCents;
  }

  const remainder = totalCents % increment;

  if (remainder === 0) {
    return totalCents;
  }

  if (rule.roundingMode === "up") {
    return totalCents + (increment - remainder);
  }

  if (rule.roundingMode === "down") {
    return totalCents - remainder;
  }

  return remainder >= increment / 2
    ? totalCents + (increment - remainder)
    : totalCents - remainder;
}
