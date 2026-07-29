import { describe, expect, it } from "vitest";

import {
  InMemoryTemplateRepository,
  createTestNicheTemplate,
} from "../test/in-memory-template-repository.js";
import { TemplateAdminService } from "./template-service.js";

describe("TemplateAdminService", () => {
  it("creates a company draft from a fixed niche template", async () => {
    const repository = new InMemoryTemplateRepository();
    const template = createTestNicheTemplate();
    repository.templates.set(template.id, template);
    const service = new TemplateAdminService(repository);

    const configuration = await service.createCompanyConfiguration(
      {
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      },
      "admin-1",
    );

    expect(configuration.status).toBe("draft");
    expect(configuration.services[0]?.fields[0]?.code).toBe("item_type");
  });

  it("applies simple predefined conditions in the preview", async () => {
    const repository = new InMemoryTemplateRepository();
    const template = createTestNicheTemplate();
    repository.templates.set(template.id, template);
    const service = new TemplateAdminService(repository);
    const configuration = await service.createCompanyConfiguration(
      {
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      },
      "admin-1",
    );

    const hiddenPreview = await service.simulateConfiguration(configuration.id, {
      answers: { has_stains: false },
    });
    const visiblePreview = await service.simulateConfiguration(configuration.id, {
      answers: { has_stains: true },
    });

    expect(
      hiddenPreview.preview.services[0]?.fields.some(
        (field) => field.code === "stain_type",
      ),
    ).toBe(false);
    expect(
      visiblePreview.preview.services[0]?.fields.some(
        (field) => field.code === "stain_type",
      ),
    ).toBe(true);
    expect(visiblePreview.calculation?.internalTotalCents).toBe(12000);
  });

  it("recalculates the estimate when dirt level changes", async () => {
    const repository = new InMemoryTemplateRepository();
    const template = createTestNicheTemplate();
    repository.templates.set(template.id, template);
    const service = new TemplateAdminService(repository);
    const configuration = await service.createCompanyConfiguration(
      {
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      },
      "admin-1",
    );
    const baseAnswers = {
      item_type: "sofa",
      quantity: 1,
      seats: 2,
      size: "small",
      fabric_type: "suede",
    };

    const light = await service.simulateConfiguration(configuration.id, {
      answers: { ...baseAnswers, dirt_level: "light" },
    });
    const heavy = await service.simulateConfiguration(configuration.id, {
      answers: { ...baseAnswers, dirt_level: "heavy" },
    });

    expect(heavy.calculation?.internalTotalCents).toBeGreaterThan(
      light.calculation?.internalTotalCents ?? 0,
    );
    expect(
      heavy.calculation?.memory.some((line) => line.ruleCode === "dirt_heavy_multiplier"),
    ).toBe(true);
  });

  it("allows Admin to deactivate a fabric option in a draft", async () => {
    const repository = new InMemoryTemplateRepository();
    const template = createTestNicheTemplate();
    repository.templates.set(template.id, template);
    const service = new TemplateAdminService(repository);
    const configuration = await service.createCompanyConfiguration(
      {
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      },
      "admin-1",
    );
    const fabricField = configuration.services[0]?.fields.find(
      (field) => field.code === "fabric_type",
    );

    if (!fabricField) {
      throw new Error("Fabric field not found.");
    }

    const updated = await service.updateConfiguration(
      configuration.id,
      {
        services: configuration.services.map((companyService) => ({
          ...toServiceUpdatePayload(companyService),
          fields: companyService.fields.map((field) =>
            field.id === fabricField.id
              ? {
                  ...toFieldUpdatePayload(field),
                  options: field.options.map((option) => ({
                    id: option.id,
                    templateFieldOptionId: option.templateFieldOptionId,
                    displayOrder: option.displayOrder,
                    isActive: option.code === "velvet" ? false : option.isActive,
                  })),
                }
              : toFieldUpdatePayload(field),
          ),
        })),
      },
      "admin-1",
    );

    const updatedFabricField = updated.services[0]?.fields.find(
      (field) => field.code === "fabric_type",
    );

    expect(
      updatedFabricField?.options.find((option) => option.code === "velvet")?.isActive,
    ).toBe(false);
  });

  it("maps calculation validation errors to application errors", async () => {
    const repository = new InMemoryTemplateRepository();
    const template = createTestNicheTemplate();
    repository.templates.set(template.id, template);
    const service = new TemplateAdminService(repository);
    const configuration = await service.createCompanyConfiguration(
      {
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      },
      "admin-1",
    );

    await expect(
      service.simulateConfiguration(configuration.id, {
        answers: {
          item_type: "sofa",
          quantity: 1,
        },
        finalAmountCents: 50000,
      }),
    ).rejects.toMatchObject({
      code: "FINAL_AMOUNT_JUSTIFICATION_REQUIRED",
      statusCode: 400,
    });
  });

  it("blocks updates after publication", async () => {
    const repository = new InMemoryTemplateRepository();
    const template = createTestNicheTemplate();
    repository.templates.set(template.id, template);
    const service = new TemplateAdminService(repository);
    const configuration = await service.createCompanyConfiguration(
      {
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      },
      "admin-1",
    );
    const published = await service.publishConfiguration(configuration.id, "admin-1");

    await expect(
      service.updateConfiguration(
        published.id,
        {
          services: published.services.map((companyService) => ({
            ...toServiceUpdatePayload(companyService),
          })),
        },
        "admin-1",
      ),
    ).rejects.toMatchObject({
      code: "CONFIGURATION_NOT_EDITABLE",
    });
  });
});

function toServiceUpdatePayload(
  companyService: Awaited<
    ReturnType<TemplateAdminService["createCompanyConfiguration"]>
  >["services"][number],
) {
  return {
    id: companyService.id,
    templateServiceId: companyService.templateServiceId,
    isActive: companyService.isActive,
    schedulingMode: companyService.schedulingMode,
    estimateMarginLowerBps: companyService.estimateMarginLowerBps,
    estimateMarginUpperBps: companyService.estimateMarginUpperBps,
    estimatedDurationMinutes: companyService.estimatedDurationMinutes,
    displayOrder: companyService.displayOrder,
    pricingRules: companyService.pricingRules.map((pricingRule) => ({
      id: pricingRule.id,
      templatePricingRuleId: pricingRule.templatePricingRuleId,
      code: pricingRule.code,
      label: pricingRule.label,
      ruleType: pricingRule.ruleType,
      targetFieldCode: pricingRule.targetFieldCode,
      targetOptionCode: pricingRule.targetOptionCode,
      quantityFieldCode: pricingRule.quantityFieldCode,
      amountCents: pricingRule.amountCents,
      percentageBps: pricingRule.percentageBps,
      multiplierBps: pricingRule.multiplierBps,
      minimumValue: pricingRule.minimumValue,
      maximumValue: pricingRule.maximumValue,
      unit: pricingRule.unit,
      condition: pricingRule.condition,
      roundingMode: pricingRule.roundingMode,
      roundingIncrementCents: pricingRule.roundingIncrementCents,
      isActive: pricingRule.isActive,
      displayOrder: pricingRule.displayOrder,
    })),
    fields: companyService.fields.map(toFieldUpdatePayload),
  };
}

function toFieldUpdatePayload(
  field: Awaited<
    ReturnType<TemplateAdminService["createCompanyConfiguration"]>
  >["services"][number]["fields"][number],
) {
  return {
    id: field.id,
    templateFieldId: field.templateFieldId,
    isActive: field.isActive,
    isRequired: field.isRequired,
    isClientVisible: field.isClientVisible,
    isCompanyEditable: field.isCompanyEditable,
    isPricingRelevant: field.isPricingRelevant,
    requiresPhoto: field.requiresPhoto,
    displayOrder: field.displayOrder,
    helpText: field.helpText,
    options: field.options.map((option) => ({
      id: option.id,
      templateFieldOptionId: option.templateFieldOptionId,
      isActive: option.isActive,
      displayOrder: option.displayOrder,
    })),
  };
}
