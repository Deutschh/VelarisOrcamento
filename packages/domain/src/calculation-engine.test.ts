import { describe, expect, it } from "vitest";
import type { CalculationPricingRule } from "./calculation-engine.js";
import { calculateEstimate } from "./calculation-engine.js";

const baseInput = {
  configurationVersion: 3,
  pricingVersion: 3,
  estimateMarginLowerBps: 500,
  estimateMarginUpperBps: 500,
  answers: {},
};

function rule(input: Partial<CalculationPricingRule>): CalculationPricingRule {
  return {
    id: input.id ?? crypto.randomUUID(),
    templatePricingRuleId: input.templatePricingRuleId ?? null,
    code: input.code ?? "rule",
    label: input.label ?? "Regra",
    ruleType: input.ruleType ?? "fixed_price",
    targetFieldCode: input.targetFieldCode ?? null,
    targetOptionCode: input.targetOptionCode ?? null,
    quantityFieldCode: input.quantityFieldCode ?? null,
    amountCents: input.amountCents ?? null,
    percentageBps: input.percentageBps ?? null,
    multiplierBps: input.multiplierBps ?? null,
    minimumValue: input.minimumValue ?? null,
    maximumValue: input.maximumValue ?? null,
    unit: input.unit ?? null,
    condition: input.condition ?? null,
    roundingMode: input.roundingMode ?? null,
    roundingIncrementCents: input.roundingIncrementCents ?? null,
    isActive: input.isActive ?? true,
    displayOrder: input.displayOrder ?? 10,
  };
}

describe("calculateEstimate", () => {
  it("calculates fixed, quantity, option and minimum rules using cents", () => {
    const result = calculateEstimate({
      ...baseInput,
      answers: {
        item_type: "sofa",
        quantity: 2,
      },
      rules: [
        rule({
          code: "sofa_base",
          label: "Sofa",
          ruleType: "option_price",
          targetFieldCode: "item_type",
          targetOptionCode: "sofa",
          quantityFieldCode: "quantity",
          amountCents: 8000,
          displayOrder: 10,
        }),
        rule({
          code: "minimum",
          label: "Minimo",
          ruleType: "minimum_value",
          amountCents: 20000,
          displayOrder: 20,
        }),
      ],
    });

    expect(result.baseAmountCents).toBe(16000);
    expect(result.internalTotalCents).toBe(20000);
    expect(result.estimateMinCents).toBe(19000);
    expect(result.estimateMaxCents).toBe(21000);
  });

  it("calculates area and linear meter rules from normalized measurements", () => {
    const result = calculateEstimate({
      ...baseInput,
      answers: {
        area: {
          originalValue: "1.2",
          originalUnit: "m2",
          normalizedValue: "1.2",
          normalizedUnit: "m2",
        },
        length: {
          originalValue: 250,
          originalUnit: "cm",
          normalizedValue: "2.5",
          normalizedUnit: "linear_m",
        },
      },
      rules: [
        rule({
          code: "area",
          label: "Area",
          ruleType: "area",
          targetFieldCode: "area",
          amountCents: 10000,
          displayOrder: 10,
        }),
        rule({
          code: "linear",
          label: "Metro linear",
          ruleType: "linear_meter",
          targetFieldCode: "length",
          amountCents: 2000,
          displayOrder: 20,
        }),
      ],
    });

    expect(result.internalTotalCents).toBe(17000);
  });

  it("applies conditions, multipliers, percentages, distance and rounding", () => {
    const result = calculateEstimate({
      ...baseInput,
      answers: {
        quantity: 1,
        urgency: "urgent",
        distance_km: {
          originalValue: 15,
          originalUnit: "km",
          normalizedValue: "15",
          normalizedUnit: "km",
        },
      },
      rules: [
        rule({
          code: "base",
          ruleType: "fixed_price",
          amountCents: 10000,
          displayOrder: 10,
        }),
        rule({
          code: "urgent_multiplier",
          ruleType: "multiplier",
          multiplierBps: 12000,
          condition: {
            sourceFieldCode: "urgency",
            operator: "equals",
            value: "urgent",
          },
          displayOrder: 20,
        }),
        rule({
          code: "percentage",
          ruleType: "percentage_addition",
          percentageBps: 1000,
          displayOrder: 30,
        }),
        rule({
          code: "distance",
          ruleType: "distance_fee",
          targetFieldCode: "distance_km",
          amountCents: 300,
          minimumValue: "10",
          displayOrder: 40,
        }),
        rule({
          code: "rounding",
          ruleType: "rounding",
          roundingMode: "up",
          roundingIncrementCents: 500,
          displayOrder: 50,
        }),
      ],
    });

    expect(result.internalTotalCents).toBe(15000);
    expect(result.adjustments.map((line) => line.ruleCode)).toEqual([
      "urgent_multiplier",
      "percentage",
      "distance",
      "rounding",
    ]);
  });

  it("applies quantity scale and range-based additions or discounts", () => {
    const result = calculateEstimate({
      ...baseInput,
      answers: {
        item_type: "sofa",
        quantity: 3,
        seats: 2,
        floor: 4,
      },
      rules: [
        rule({
          code: "sofa_base",
          label: "Sofa",
          ruleType: "option_price",
          targetFieldCode: "item_type",
          targetOptionCode: "sofa",
          quantityFieldCode: "quantity",
          amountCents: 10000,
          displayOrder: 10,
        }),
        rule({
          code: "seats",
          label: "Lugares",
          ruleType: "quantity",
          targetFieldCode: "seats",
          quantityFieldCode: "quantity",
          amountCents: 1000,
          displayOrder: 20,
        }),
        rule({
          code: "floor_access",
          label: "Acesso por andar",
          ruleType: "fixed_addition",
          targetFieldCode: "floor",
          amountCents: 3000,
          minimumValue: "2",
          unit: "unit",
          displayOrder: 30,
        }),
        rule({
          code: "quantity_discount",
          label: "Desconto por quantidade",
          ruleType: "administrative_discount",
          targetFieldCode: "quantity",
          percentageBps: 500,
          minimumValue: "3",
          unit: "unit",
          displayOrder: 40,
        }),
      ],
    });

    expect(result.internalTotalCents).toBe(37050);
    expect(result.memory.map((line) => line.ruleCode)).toEqual([
      "sofa_base",
      "seats",
      "floor_access",
      "quantity_discount",
    ]);
  });

  it("requires justification for final amount outside the estimate range", () => {
    expect(() =>
      calculateEstimate({
        ...baseInput,
        finalAmountCents: 30000,
        rules: [
          rule({
            code: "base",
            ruleType: "fixed_price",
            amountCents: 10000,
          }),
        ],
      }),
    ).toThrow(/justification/);
  });

  it("is deterministic for the same snapshot and answers", () => {
    const input = {
      ...baseInput,
      answers: { quantity: 3 },
      rules: [
        rule({
          id: "10000000-0000-4000-8000-000000000001",
          code: "quantity",
          ruleType: "quantity",
          targetFieldCode: "quantity",
          amountCents: 2500,
        }),
      ],
    };

    expect(calculateEstimate(input)).toEqual(calculateEstimate(input));
  });
});
