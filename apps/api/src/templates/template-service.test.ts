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
            fields: companyService.fields.map((field) => ({
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
            })),
          })),
        },
        "admin-1",
      ),
    ).rejects.toMatchObject({
      code: "CONFIGURATION_NOT_EDITABLE",
    });
  });
});
