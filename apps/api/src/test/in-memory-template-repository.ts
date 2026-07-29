import type {
  CompanyConfigurationDetail,
  CompanyConfigurationSnapshot,
  CompanyConfigurationStatus,
  NicheTemplate,
} from "@velaris/shared";

import type {
  PersistConfigurationInput,
  PublishConfigurationInput,
  TemplateRepository,
} from "../templates/template-repository.js";

export class InMemoryTemplateRepository implements TemplateRepository {
  readonly templates = new Map<string, NicheTemplate>();
  readonly configurations = new Map<string, CompanyConfigurationDetail>();

  async listTemplates(): Promise<NicheTemplate[]> {
    return Array.from(this.templates.values());
  }

  async findTemplateById(templateId: string): Promise<NicheTemplate | null> {
    return this.templates.get(templateId) ?? null;
  }

  async findCompanyConfigurationById(
    configurationId: string,
  ): Promise<CompanyConfigurationDetail | null> {
    return this.configurations.get(configurationId) ?? null;
  }

  async findLatestCompanyConfiguration(input: {
    companyId: string;
    templateId: string;
    statuses?: CompanyConfigurationStatus[];
  }): Promise<CompanyConfigurationDetail | null> {
    return (
      Array.from(this.configurations.values())
        .filter(
          (configuration) =>
            configuration.companyId === input.companyId &&
            configuration.templateId === input.templateId &&
            (!input.statuses || input.statuses.includes(configuration.status)),
        )
        .sort((left, right) => right.version - left.version)[0] ?? null
    );
  }

  async listCompanyConfigurations(
    companyId: string,
  ): Promise<CompanyConfigurationDetail[]> {
    return Array.from(this.configurations.values())
      .filter((configuration) => configuration.companyId === companyId)
      .sort((left, right) => right.version - left.version);
  }

  async createDraftConfiguration(input: PersistConfigurationInput): Promise<void> {
    this.configurations.set(input.configuration.id, input.configuration);
  }

  async replaceDraftConfiguration(input: PersistConfigurationInput): Promise<void> {
    this.configurations.set(input.configuration.id, input.configuration);
  }

  async publishConfiguration(input: PublishConfigurationInput): Promise<void> {
    for (const configuration of this.configurations.values()) {
      if (
        configuration.companyId === input.configuration.companyId &&
        configuration.templateId === input.configuration.templateId &&
        configuration.status === "published"
      ) {
        this.configurations.set(configuration.id, {
          ...configuration,
          status: "archived",
        });
      }
    }

    this.configurations.set(input.configuration.id, {
      ...input.configuration,
      status: "published",
      publishedAt: input.publishedAt.toISOString(),
      snapshot: input.snapshot as unknown as CompanyConfigurationSnapshot,
    });
  }
}

export function createTestNicheTemplate(): NicheTemplate {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    code: "cleaning_upholstery",
    name: "Limpeza de estofados",
    description: "Template inicial do nicho piloto.",
    version: 1,
    services: [
      {
        id: "10000000-0000-4000-8000-000000000101",
        code: "upholstery_cleaning",
        name: "Higienizacao de estofados",
        description: "Servico principal do MVP piloto.",
        displayOrder: 10,
        isActiveDefault: true,
        defaultSchedulingMode: "required_with_proposal",
        fields: [
          {
            id: "10000000-0000-4000-8000-000000001001",
            code: "item_type",
            label: "Tipo de item",
            fieldType: "single_select",
            helpText: null,
            displayOrder: 10,
            isRequiredDefault: true,
            isActiveDefault: true,
            isClientVisibleDefault: true,
            isCompanyEditableDefault: true,
            isPricingRelevantDefault: true,
            requiresPhotoDefault: false,
            condition: null,
            options: [
              {
                id: "10000000-0000-4000-8000-000000010001",
                code: "sofa",
                label: "Sofa",
                displayOrder: 10,
                isActiveDefault: true,
              },
            ],
          },
          {
            id: "10000000-0000-4000-8000-000000001002",
            code: "has_stains",
            label: "Possui manchas?",
            fieldType: "boolean",
            helpText: null,
            displayOrder: 20,
            isRequiredDefault: false,
            isActiveDefault: true,
            isClientVisibleDefault: true,
            isCompanyEditableDefault: true,
            isPricingRelevantDefault: true,
            requiresPhotoDefault: false,
            condition: null,
            options: [],
          },
          {
            id: "10000000-0000-4000-8000-000000001003",
            code: "stain_type",
            label: "Tipo de mancha",
            fieldType: "multi_select",
            helpText: "Exibido apenas quando ha manchas.",
            displayOrder: 30,
            isRequiredDefault: false,
            isActiveDefault: true,
            isClientVisibleDefault: true,
            isCompanyEditableDefault: true,
            isPricingRelevantDefault: true,
            requiresPhotoDefault: false,
            condition: {
              sourceFieldCode: "has_stains",
              operator: "equals",
              value: true,
            },
            options: [
              {
                id: "10000000-0000-4000-8000-000000010002",
                code: "food",
                label: "Comida",
                displayOrder: 10,
                isActiveDefault: true,
              },
            ],
          },
        ],
      },
    ],
  };
}
