import { z } from "zod";
import type {
  CalculationAnswers,
  CalculationResult,
  CompanyPricingVersionSummary,
  PricingRuleConfiguration,
  TemplatePricingRule,
} from "./pricing.js";
import type { publicCompanyCategorySchema } from "./public.js";

export const templateFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "currency",
  "boolean",
  "single_select",
  "multi_select",
  "measurement",
  "address",
  "date",
  "image",
  "file",
]);

export type TemplateFieldType = z.infer<typeof templateFieldTypeSchema>;

export const schedulingModeSchema = z.enum([
  "required_with_proposal",
  "optional_with_proposal",
  "after_proposal_acceptance",
  "external_only",
]);

export type SchedulingMode = z.infer<typeof schedulingModeSchema>;

export const companyConfigurationStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

export type CompanyConfigurationStatus = z.infer<typeof companyConfigurationStatusSchema>;

export const conditionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);

export const templateFieldConditionSchema = z.object({
  sourceFieldCode: z.string().trim().min(1).max(120),
  operator: z.enum(["equals", "not_equals", "includes"]),
  value: conditionValueSchema,
});

export type TemplateFieldCondition = z.infer<typeof templateFieldConditionSchema>;

export interface TemplateFieldOption {
  id: string;
  code: string;
  label: string;
  displayOrder: number;
  isActiveDefault: boolean;
}

export interface TemplateField {
  id: string;
  code: string;
  label: string;
  fieldType: TemplateFieldType;
  helpText: string | null;
  displayOrder: number;
  isRequiredDefault: boolean;
  isActiveDefault: boolean;
  isClientVisibleDefault: boolean;
  isCompanyEditableDefault: boolean;
  isPricingRelevantDefault: boolean;
  requiresPhotoDefault: boolean;
  condition: TemplateFieldCondition | null;
  options: TemplateFieldOption[];
}

export interface TemplateService {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActiveDefault: boolean;
  defaultSchedulingMode: SchedulingMode;
  pricingRules: TemplatePricingRule[];
  fields: TemplateField[];
}

export interface NicheTemplate {
  id: string;
  code: z.infer<typeof publicCompanyCategorySchema>;
  name: string;
  description: string | null;
  version: number;
  services: TemplateService[];
}

export interface CompanyFieldOptionConfiguration {
  id: string;
  templateFieldOptionId: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CompanyFieldConfiguration {
  id: string;
  templateFieldId: string;
  code: string;
  label: string;
  fieldType: TemplateFieldType;
  helpText: string | null;
  displayOrder: number;
  isActive: boolean;
  isRequired: boolean;
  isClientVisible: boolean;
  isCompanyEditable: boolean;
  isPricingRelevant: boolean;
  requiresPhoto: boolean;
  condition: TemplateFieldCondition | null;
  options: CompanyFieldOptionConfiguration[];
}

export interface CompanyServiceConfiguration {
  id: string;
  templateServiceId: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  schedulingMode: SchedulingMode;
  estimateMarginLowerBps: number;
  estimateMarginUpperBps: number;
  estimatedDurationMinutes: number | null;
  pricingRules: PricingRuleConfiguration[];
  fields: CompanyFieldConfiguration[];
}

export interface CompanyConfigurationDetail {
  id: string;
  companyId: string;
  templateId: string;
  templateCode: z.infer<typeof publicCompanyCategorySchema>;
  templateName: string;
  status: CompanyConfigurationStatus;
  version: number;
  publishedAt: string | null;
  snapshot: CompanyConfigurationSnapshot | null;
  pricingVersion: CompanyPricingVersionSummary | null;
  services: CompanyServiceConfiguration[];
}

export interface CompanyConfigurationSnapshot {
  configurationId: string;
  companyId: string;
  templateId: string;
  templateCode: string;
  templateVersion: number;
  configurationVersion: number;
  publishedAt: string;
  pricingVersion: CompanyPricingVersionSummary | null;
  services: CompanyServiceConfiguration[];
}

export const adminCreateCompanyConfigurationRequestSchema = z.object({
  companyId: z.string().uuid(),
  templateId: z.string().uuid(),
});

export type AdminCreateCompanyConfigurationRequest = z.infer<
  typeof adminCreateCompanyConfigurationRequestSchema
>;

const optionConfigurationRequestSchema = z.object({
  id: z.string().uuid().optional(),
  templateFieldOptionId: z.string().uuid(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

const fieldConfigurationRequestSchema = z.object({
  id: z.string().uuid().optional(),
  templateFieldId: z.string().uuid(),
  isActive: z.boolean(),
  isRequired: z.boolean(),
  isClientVisible: z.boolean(),
  isCompanyEditable: z.boolean(),
  isPricingRelevant: z.boolean(),
  requiresPhoto: z.boolean(),
  displayOrder: z.number().int().min(0),
  helpText: z.string().trim().max(400).nullable(),
  options: z.array(optionConfigurationRequestSchema),
});

const serviceConfigurationRequestSchema = z.object({
  id: z.string().uuid().optional(),
  templateServiceId: z.string().uuid(),
  isActive: z.boolean(),
  schedulingMode: schedulingModeSchema,
  estimateMarginLowerBps: z.number().int().min(0).max(10000),
  estimateMarginUpperBps: z.number().int().min(0).max(10000),
  estimatedDurationMinutes: z.number().int().positive().nullable(),
  displayOrder: z.number().int().min(0),
  pricingRules: z.array(
    z.object({
      id: z.string().uuid().optional(),
      templatePricingRuleId: z.string().uuid().nullable(),
      code: z.string().trim().min(1).max(120),
      label: z.string().trim().min(1).max(160),
      ruleType: z.enum([
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
      ]),
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
      unit: z.enum(["unit", "m", "m2", "linear_m", "km"]).nullable(),
      condition: templateFieldConditionSchema.nullable(),
      roundingMode: z.enum(["nearest", "up", "down"]).nullable(),
      roundingIncrementCents: z.number().int().min(1).nullable(),
      isActive: z.boolean(),
      displayOrder: z.number().int().min(0),
    }),
  ),
  fields: z.array(fieldConfigurationRequestSchema),
});

export const adminUpdateCompanyConfigurationRequestSchema = z.object({
  services: z.array(serviceConfigurationRequestSchema).min(1),
});

export type AdminUpdateCompanyConfigurationRequest = z.infer<
  typeof adminUpdateCompanyConfigurationRequestSchema
>;

const measurementAnswerSchema = z.object({
  originalValue: z.union([z.number(), z.string()]),
  originalUnit: z.enum(["mm", "cm", "m", "m2", "km", "unit"]),
  normalizedValue: z.union([z.number(), z.string()]),
  normalizedUnit: z.enum(["unit", "m", "m2", "linear_m", "km"]),
});

export const adminSimulateCompanyConfigurationRequestSchema = z.object({
  answers: z
    .record(z.string(), z.union([conditionValueSchema, measurementAnswerSchema]))
    .default({}),
  finalAmountCents: z.number().int().min(0).optional(),
  finalAmountJustification: z.string().trim().max(800).optional(),
});

export type AdminSimulateCompanyConfigurationRequest = z.infer<
  typeof adminSimulateCompanyConfigurationRequestSchema
>;

export interface CompanyConfigurationPreview {
  configurationId: string;
  version: number;
  services: Array<{
    id: string;
    code: string;
    name: string;
    schedulingMode: SchedulingMode;
    fields: Array<{
      id: string;
      code: string;
      label: string;
      fieldType: TemplateFieldType;
      helpText: string | null;
      isRequired: boolean;
      requiresPhoto: boolean;
      options: CompanyFieldOptionConfiguration[];
    }>;
  }>;
}

export interface CompanyConfigurationSimulation {
  preview: CompanyConfigurationPreview;
  calculation: CalculationResult | null;
  answers: CalculationAnswers;
}

export interface NicheTemplatesResponse {
  templates: NicheTemplate[];
}

export interface CompanyConfigurationResponse {
  configuration: CompanyConfigurationDetail;
}

export interface CompanyConfigurationPreviewResponse {
  preview: CompanyConfigurationPreview;
  calculation: CalculationResult | null;
}
