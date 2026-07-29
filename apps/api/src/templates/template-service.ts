import { randomUUID } from "node:crypto";
import {
  CalculationError,
  calculateEstimate,
  ConfigurationLifecycleError,
  assertDraftConfiguration,
  shouldShowField,
} from "@velaris/domain";
import type { CalculationAnswers, CalculationPricingRule } from "@velaris/domain";
import type {
  AdminCreateCompanyConfigurationRequest,
  AdminSimulateCompanyConfigurationRequest,
  AdminUpdateCompanyConfigurationRequest,
  CompanyConfigurationDetail,
  CompanyConfigurationPreview,
  CompanyConfigurationSimulation,
  CompanyConfigurationSnapshot,
  CompanyFieldConfiguration,
  CompanyFieldOptionConfiguration,
  CompanyServiceConfiguration,
  NicheTemplate,
  PricingRuleConfiguration,
  TemplatePricingRule,
  TemplateField,
  TemplateFieldOption,
  TemplateService,
} from "@velaris/shared";

import {
  CompanyConfigurationCalculationError,
  CompanyConfigurationNotEditableError,
  CompanyConfigurationNotFoundError,
  CompanyConfigurationTemplateMismatchError,
  TemplateNotFoundError,
} from "./template-errors.js";
import type { TemplateRepository } from "./template-repository.js";

export class TemplateAdminService {
  constructor(private readonly repository: TemplateRepository) {}

  async listTemplates(): Promise<NicheTemplate[]> {
    return this.repository.listTemplates();
  }

  async listCompanyConfigurations(
    companyId: string,
  ): Promise<CompanyConfigurationDetail[]> {
    return this.repository.listCompanyConfigurations(companyId);
  }

  async createCompanyConfiguration(
    input: AdminCreateCompanyConfigurationRequest,
    actorUserId: string,
  ): Promise<CompanyConfigurationDetail> {
    const template = await this.repository.findTemplateById(input.templateId);

    if (!template) {
      throw new TemplateNotFoundError();
    }

    const existingDraft = await this.repository.findLatestCompanyConfiguration({
      companyId: input.companyId,
      templateId: input.templateId,
      statuses: ["draft"],
    });

    if (existingDraft) {
      return existingDraft;
    }

    const latestPublished = await this.repository.findLatestCompanyConfiguration({
      companyId: input.companyId,
      templateId: input.templateId,
      statuses: ["published"],
    });
    const existingConfigurations = await this.repository.listCompanyConfigurations(
      input.companyId,
    );
    const nextVersion =
      Math.max(
        0,
        ...existingConfigurations
          .filter((configuration) => configuration.templateId === input.templateId)
          .map((configuration) => configuration.version),
      ) + 1;
    const configuration = latestPublished
      ? cloneConfiguration(latestPublished, nextVersion)
      : createConfigurationFromTemplate(input.companyId, template, nextVersion);

    await this.repository.createDraftConfiguration({
      configuration,
      actorUserId,
      ...(latestPublished ? { createdFromConfigurationId: latestPublished.id } : {}),
    });

    return this.getConfiguration(configuration.id);
  }

  async getConfiguration(id: string): Promise<CompanyConfigurationDetail> {
    const configuration = await this.repository.findCompanyConfigurationById(id);

    if (!configuration) {
      throw new CompanyConfigurationNotFoundError();
    }

    return configuration;
  }

  async updateConfiguration(
    id: string,
    input: AdminUpdateCompanyConfigurationRequest,
    actorUserId: string,
  ): Promise<CompanyConfigurationDetail> {
    const configuration = await this.getConfiguration(id);
    const template = await this.repository.findTemplateById(configuration.templateId);

    if (!template) {
      throw new TemplateNotFoundError();
    }

    try {
      assertDraftConfiguration(configuration.status);
    } catch (error) {
      if (error instanceof ConfigurationLifecycleError) {
        throw new CompanyConfigurationNotEditableError();
      }

      throw error;
    }

    const updatedConfiguration: CompanyConfigurationDetail = {
      ...configuration,
      services: input.services.map((serviceInput) =>
        mergeServiceConfiguration(serviceInput, template),
      ),
    };

    await this.repository.replaceDraftConfiguration({
      configuration: updatedConfiguration,
      actorUserId,
    });

    return this.getConfiguration(id);
  }

  async simulateConfiguration(
    id: string,
    input: AdminSimulateCompanyConfigurationRequest,
  ): Promise<CompanyConfigurationSimulation> {
    const configuration = await this.getConfiguration(id);
    const preview = createConfigurationPreview(configuration, input);
    const serviceForCalculation =
      configuration.services.find(
        (service) =>
          service.isActive && service.pricingRules.some((rule) => rule.isActive),
      ) ?? null;
    const calculation =
      serviceForCalculation && configuration.pricingVersion
        ? runCalculation({
            configuration,
            service: serviceForCalculation,
            request: input,
          })
        : null;

    return {
      preview,
      calculation,
      answers: input.answers,
    };
  }

  async publishConfiguration(
    id: string,
    actorUserId: string,
  ): Promise<CompanyConfigurationDetail> {
    const configuration = await this.getConfiguration(id);

    try {
      assertDraftConfiguration(configuration.status);
    } catch (error) {
      if (error instanceof ConfigurationLifecycleError) {
        throw new CompanyConfigurationNotEditableError();
      }

      throw error;
    }

    const publishedAt = new Date();
    const snapshot = createConfigurationSnapshot(configuration, publishedAt);

    await this.repository.publishConfiguration({
      configuration,
      snapshot: snapshot as unknown as Record<string, unknown>,
      actorUserId,
      publishedAt,
    });

    return this.getConfiguration(id);
  }
}

function runCalculation(input: {
  configuration: CompanyConfigurationDetail;
  service: CompanyServiceConfiguration;
  request: AdminSimulateCompanyConfigurationRequest;
}) {
  try {
    return calculateEstimate({
      configurationVersion: input.configuration.version,
      pricingVersion: input.configuration.pricingVersion?.version ?? 1,
      answers: input.request.answers as CalculationAnswers,
      rules: input.service.pricingRules.map(toCalculationRule),
      estimateMarginLowerBps: input.service.estimateMarginLowerBps,
      estimateMarginUpperBps: input.service.estimateMarginUpperBps,
      ...(input.request.finalAmountCents !== undefined
        ? { finalAmountCents: input.request.finalAmountCents }
        : {}),
      ...(input.request.finalAmountJustification
        ? { finalAmountJustification: input.request.finalAmountJustification }
        : {}),
      allowZeroTotal: true,
    });
  } catch (error) {
    if (error instanceof CalculationError) {
      throw new CompanyConfigurationCalculationError(error.code, error.message);
    }

    throw error;
  }
}

function createConfigurationFromTemplate(
  companyId: string,
  template: NicheTemplate,
  version: number,
): CompanyConfigurationDetail {
  return {
    id: randomUUID(),
    companyId,
    templateId: template.id,
    templateCode: template.code,
    templateName: template.name,
    status: "draft",
    version,
    publishedAt: null,
    snapshot: null,
    pricingVersion: {
      id: randomUUID(),
      status: "draft",
      version,
      publishedAt: null,
      snapshot: null,
    },
    services: template.services
      .sort(byDisplayOrder)
      .map((service) => createServiceConfiguration(service)),
  };
}

function cloneConfiguration(
  configuration: CompanyConfigurationDetail,
  version: number,
): CompanyConfigurationDetail {
  return {
    ...configuration,
    id: randomUUID(),
    status: "draft",
    version,
    publishedAt: null,
    snapshot: null,
    pricingVersion: {
      id: randomUUID(),
      status: "draft",
      version,
      publishedAt: null,
      snapshot: null,
    },
    services: configuration.services.map((service) => ({
      ...service,
      id: randomUUID(),
      pricingRules: service.pricingRules.map((rule) => ({
        ...rule,
        id: randomUUID(),
      })),
      fields: service.fields.map((field) => ({
        ...field,
        id: randomUUID(),
        options: field.options.map((option) => ({
          ...option,
          id: randomUUID(),
        })),
      })),
    })),
  };
}

function createServiceConfiguration(
  service: TemplateService,
): CompanyServiceConfiguration {
  return {
    id: randomUUID(),
    templateServiceId: service.id,
    code: service.code,
    name: service.name,
    description: service.description,
    displayOrder: service.displayOrder,
    isActive: service.isActiveDefault,
    schedulingMode: service.defaultSchedulingMode,
    estimateMarginLowerBps: 500,
    estimateMarginUpperBps: 500,
    estimatedDurationMinutes: null,
    pricingRules: service.pricingRules
      .sort(byDisplayOrder)
      .map((rule) => createPricingRuleConfiguration(rule)),
    fields: service.fields
      .sort(byDisplayOrder)
      .map((field) => createFieldConfiguration(field)),
  };
}

function createFieldConfiguration(field: TemplateField): CompanyFieldConfiguration {
  return {
    id: randomUUID(),
    templateFieldId: field.id,
    code: field.code,
    label: field.label,
    fieldType: field.fieldType,
    helpText: field.helpText,
    displayOrder: field.displayOrder,
    isActive: field.isActiveDefault,
    isRequired: field.isRequiredDefault,
    isClientVisible: field.isClientVisibleDefault,
    isCompanyEditable: field.isCompanyEditableDefault,
    isPricingRelevant: field.isPricingRelevantDefault,
    requiresPhoto: field.requiresPhotoDefault,
    condition: field.condition,
    options: field.options
      .sort(byDisplayOrder)
      .map((option) => createOptionConfiguration(option)),
  };
}

function createOptionConfiguration(
  option: TemplateFieldOption,
): CompanyFieldOptionConfiguration {
  return {
    id: randomUUID(),
    templateFieldOptionId: option.id,
    code: option.code,
    label: option.label,
    displayOrder: option.displayOrder,
    isActive: option.isActiveDefault,
  };
}

function mergeServiceConfiguration(
  serviceInput: AdminUpdateCompanyConfigurationRequest["services"][number],
  template: NicheTemplate,
): CompanyServiceConfiguration {
  const templateService = template.services.find(
    (service) => service.id === serviceInput.templateServiceId,
  );

  if (!templateService) {
    throw new CompanyConfigurationTemplateMismatchError();
  }

  return {
    id: serviceInput.id ?? randomUUID(),
    templateServiceId: templateService.id,
    code: templateService.code,
    name: templateService.name,
    description: templateService.description,
    displayOrder: serviceInput.displayOrder,
    isActive: serviceInput.isActive,
    schedulingMode: serviceInput.schedulingMode,
    estimateMarginLowerBps: serviceInput.estimateMarginLowerBps,
    estimateMarginUpperBps: serviceInput.estimateMarginUpperBps,
    estimatedDurationMinutes: serviceInput.estimatedDurationMinutes,
    pricingRules: serviceInput.pricingRules.map((ruleInput) =>
      mergePricingRuleConfiguration(ruleInput, templateService),
    ),
    fields: serviceInput.fields.map((fieldInput) =>
      mergeFieldConfiguration(fieldInput, templateService),
    ),
  };
}

function mergeFieldConfiguration(
  fieldInput: AdminUpdateCompanyConfigurationRequest["services"][number]["fields"][number],
  templateService: TemplateService,
): CompanyFieldConfiguration {
  const templateField = templateService.fields.find(
    (field) => field.id === fieldInput.templateFieldId,
  );

  if (!templateField) {
    throw new CompanyConfigurationTemplateMismatchError();
  }

  return {
    id: fieldInput.id ?? randomUUID(),
    templateFieldId: templateField.id,
    code: templateField.code,
    label: templateField.label,
    fieldType: templateField.fieldType,
    helpText: fieldInput.helpText,
    displayOrder: fieldInput.displayOrder,
    isActive: fieldInput.isActive,
    isRequired: fieldInput.isRequired,
    isClientVisible: fieldInput.isClientVisible,
    isCompanyEditable: fieldInput.isCompanyEditable,
    isPricingRelevant: fieldInput.isPricingRelevant,
    requiresPhoto: fieldInput.requiresPhoto,
    condition: templateField.condition,
    options: fieldInput.options.map((optionInput) =>
      mergeOptionConfiguration(optionInput, templateField),
    ),
  };
}

function mergeOptionConfiguration(
  optionInput: AdminUpdateCompanyConfigurationRequest["services"][number]["fields"][number]["options"][number],
  templateField: TemplateField,
): CompanyFieldOptionConfiguration {
  const templateOption = templateField.options.find(
    (option) => option.id === optionInput.templateFieldOptionId,
  );

  if (!templateOption) {
    throw new CompanyConfigurationTemplateMismatchError();
  }

  return {
    id: optionInput.id ?? randomUUID(),
    templateFieldOptionId: templateOption.id,
    code: templateOption.code,
    label: templateOption.label,
    displayOrder: optionInput.displayOrder,
    isActive: optionInput.isActive,
  };
}

function createConfigurationSnapshot(
  configuration: CompanyConfigurationDetail,
  publishedAt: Date,
): CompanyConfigurationSnapshot {
  return {
    configurationId: configuration.id,
    companyId: configuration.companyId,
    templateId: configuration.templateId,
    templateCode: configuration.templateCode,
    templateVersion: configuration.version,
    configurationVersion: configuration.version,
    publishedAt: publishedAt.toISOString(),
    pricingVersion: configuration.pricingVersion
      ? {
          ...configuration.pricingVersion,
          status: "published",
          publishedAt: publishedAt.toISOString(),
        }
      : null,
    services: configuration.services,
  };
}

function createConfigurationPreview(
  configuration: CompanyConfigurationDetail,
  input: AdminSimulateCompanyConfigurationRequest,
): CompanyConfigurationPreview {
  return {
    configurationId: configuration.id,
    version: configuration.version,
    services: configuration.services
      .filter((service) => service.isActive)
      .sort(byDisplayOrder)
      .map((service) => ({
        id: service.id,
        code: service.code,
        name: service.name,
        schedulingMode: service.schedulingMode,
        fields: service.fields
          .filter(
            (field) =>
              field.isActive &&
              field.isClientVisible &&
              shouldShowField({
                condition: field.condition,
                answers: toConditionAnswers(input.answers),
              }),
          )
          .sort(byDisplayOrder)
          .map((field) => ({
            id: field.id,
            code: field.code,
            label: field.label,
            fieldType: field.fieldType,
            helpText: field.helpText,
            isRequired: field.isRequired,
            requiresPhoto: field.requiresPhoto,
            options: field.options
              .filter((option) => option.isActive)
              .sort(byDisplayOrder),
          })),
      })),
  };
}

function createPricingRuleConfiguration(
  rule: TemplatePricingRule,
): PricingRuleConfiguration {
  return {
    id: randomUUID(),
    templatePricingRuleId: rule.id,
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
    isActive: rule.isActiveDefault,
    displayOrder: rule.displayOrder,
  };
}

function mergePricingRuleConfiguration(
  ruleInput: AdminUpdateCompanyConfigurationRequest["services"][number]["pricingRules"][number],
  templateService: TemplateService,
): PricingRuleConfiguration {
  const templateRule = templateService.pricingRules.find(
    (rule) => rule.id === ruleInput.templatePricingRuleId,
  );

  if (!templateRule) {
    throw new CompanyConfigurationTemplateMismatchError();
  }

  return {
    id: ruleInput.id ?? randomUUID(),
    templatePricingRuleId: templateRule.id,
    code: templateRule.code,
    label: templateRule.label,
    ruleType: templateRule.ruleType,
    targetFieldCode: templateRule.targetFieldCode,
    targetOptionCode: templateRule.targetOptionCode,
    quantityFieldCode: templateRule.quantityFieldCode,
    amountCents: ruleInput.amountCents,
    percentageBps: ruleInput.percentageBps,
    multiplierBps: ruleInput.multiplierBps,
    minimumValue: ruleInput.minimumValue,
    maximumValue: ruleInput.maximumValue,
    unit: templateRule.unit,
    condition: templateRule.condition,
    roundingMode: ruleInput.roundingMode,
    roundingIncrementCents: ruleInput.roundingIncrementCents,
    isActive: ruleInput.isActive,
    displayOrder: ruleInput.displayOrder,
  };
}

function toConditionAnswers(input: AdminSimulateCompanyConfigurationRequest["answers"]) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => typeof value !== "object" || value === null || Array.isArray(value),
    ),
  ) as Record<string, string | number | boolean | string[] | number[]>;
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

function byDisplayOrder<T extends { displayOrder: number }>(left: T, right: T) {
  return left.displayOrder - right.displayOrder;
}
