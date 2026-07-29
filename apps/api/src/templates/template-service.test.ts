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
      hiddenPreview.services[0]?.fields.some((field) => field.code === "stain_type"),
    ).toBe(false);
    expect(
      visiblePreview.services[0]?.fields.some((field) => field.code === "stain_type"),
    ).toBe(true);
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
            displayOrder: companyService.displayOrder,
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
