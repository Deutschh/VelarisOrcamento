import { z } from "zod";
import { conditionValueSchema, templateFieldConditionSchema } from "./templates.js";
import type { companyConfigurationStatusSchema } from "./templates.js";

export const pricingRuleTypeSchema = z.enum([
  "fixed_price",
  "quantity",
  "area",
  "linear_meter",
  "multiplier",
  "fixed_addition",
  "percentage_addition",
  "minimum_value",
  "minimum_area",
  "price_range",
  "option_price",
  "distance_fee",
  "administrative_discount",
  "rounding",
]);

export type PricingRuleType = z.infer<typeof pricingRuleTypeSchema>;

export const pricingRuleUnitSchema = z.enum(["unit", "m", "m2", "linear_m", "km"]);

export type PricingRuleUnit = z.infer<typeof pricingRuleUnitSchema>;

export const roundingModeSchema = z.enum(["nearest", "up", "down"]);

export type RoundingMode = z.infer<typeof roundingModeSchema>;

export const measurementAnswerSchema = z.object({
  originalValue: z.union([z.number(), z.string()]),
  originalUnit: z.enum(["mm", "cm", "m", "m2", "km", "unit"]),
  normalizedValue: z.union([z.number(), z.string()]),
  normalizedUnit: pricingRuleUnitSchema,
});

export type MeasurementAnswer = z.infer<typeof measurementAnswerSchema>;

export const calculationAnswerValueSchema = z.union([
  conditionValueSchema,
  measurementAnswerSchema,
]);

export type CalculationAnswerValue = z.infer<typeof calculationAnswerValueSchema>;

export const calculationAnswersSchema = z.record(
  z.string(),
  calculationAnswerValueSchema,
);

export type CalculationAnswers = z.infer<typeof calculationAnswersSchema>;

export interface PricingRuleConfiguration {
  id: string;
  templatePricingRuleId: string | null;
  code: string;
  label: string;
  ruleType: PricingRuleType;
  targetFieldCode: string | null;
  targetOptionCode: string | null;
  quantityFieldCode: string | null;
  amountCents: number | null;
  percentageBps: number | null;
  multiplierBps: number | null;
  minimumValue: string | null;
  maximumValue: string | null;
  unit: PricingRuleUnit | null;
  condition: z.infer<typeof templateFieldConditionSchema> | null;
  roundingMode: RoundingMode | null;
  roundingIncrementCents: number | null;
  isActive: boolean;
  displayOrder: number;
}

export interface TemplatePricingRule {
  id: string;
  templateServiceId: string;
  code: string;
  label: string;
  ruleType: PricingRuleType;
  targetFieldCode: string | null;
  targetOptionCode: string | null;
  quantityFieldCode: string | null;
  amountCents: number | null;
  percentageBps: number | null;
  multiplierBps: number | null;
  minimumValue: string | null;
  maximumValue: string | null;
  unit: PricingRuleUnit | null;
  condition: z.infer<typeof templateFieldConditionSchema> | null;
  roundingMode: RoundingMode | null;
  roundingIncrementCents: number | null;
  isActiveDefault: boolean;
  displayOrder: number;
}

export interface CompanyPricingVersionSummary {
  id: string;
  status: z.infer<typeof companyConfigurationStatusSchema>;
  version: number;
  publishedAt: string | null;
  snapshot: CompanyPricingSnapshot | null;
}

export interface CompanyPricingSnapshot {
  pricingVersionId: string;
  companyConfigurationId: string;
  configurationVersion: number;
  pricingVersion: number;
  publishedAt: string;
  services: Array<{
    id: string;
    code: string;
    estimateMarginLowerBps: number;
    estimateMarginUpperBps: number;
    rules: PricingRuleConfiguration[];
  }>;
}

export interface CalculationLine {
  id: string;
  ruleId: string;
  ruleCode: string;
  label: string;
  amountCents: number;
  explanation: string;
}

export interface CalculationResult {
  baseAmountCents: number;
  items: CalculationLine[];
  adjustments: CalculationLine[];
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  configurationVersion: number;
  pricingVersion: number;
  finalAmountCents: number;
  finalAmountRequiresJustification: boolean;
  memory: CalculationLine[];
  snapshot: {
    configurationVersion: number;
    pricingVersion: number;
    answers: CalculationAnswers;
    rules: PricingRuleConfiguration[];
    result: {
      baseAmountCents: number;
      internalTotalCents: number;
      estimateMinCents: number;
      estimateMaxCents: number;
      finalAmountCents: number;
    };
  };
}

const pricingRuleRequestSchema = z.object({
  id: z.string().uuid().optional(),
  templatePricingRuleId: z.string().uuid().nullable(),
  code: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160),
  ruleType: pricingRuleTypeSchema,
  targetFieldCode: z.string().trim().min(1).max(120).nullable(),
  targetOptionCode: z.string().trim().min(1).max(120).nullable(),
  quantityFieldCode: z.string().trim().min(1).max(120).nullable(),
  amountCents: z.number().int().min(0).nullable(),
  percentageBps: z.number().int().min(0).max(10000).nullable(),
  multiplierBps: z.number().int().min(0).max(100000).nullable(),
  minimumValue: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/)
    .nullable(),
  maximumValue: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/)
    .nullable(),
  unit: pricingRuleUnitSchema.nullable(),
  condition: templateFieldConditionSchema.nullable(),
  roundingMode: roundingModeSchema.nullable(),
  roundingIncrementCents: z.number().int().min(1).nullable(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export type PricingRuleRequest = z.infer<typeof pricingRuleRequestSchema>;

export const pricingRulesRequestSchema = z.array(pricingRuleRequestSchema);
