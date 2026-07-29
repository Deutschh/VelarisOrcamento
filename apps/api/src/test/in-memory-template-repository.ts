import type {
  CompanyConfigurationDetail,
  CompanyConfigurationSnapshot,
  CompanyConfigurationStatus,
  NicheTemplate,
  TemplateField,
  TemplateFieldOption,
  TemplatePricingRule,
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
          pricingVersion: configuration.pricingVersion
            ? {
                ...configuration.pricingVersion,
                status: "archived",
              }
            : null,
        });
      }
    }

    this.configurations.set(input.configuration.id, {
      ...input.configuration,
      status: "published",
      publishedAt: input.publishedAt.toISOString(),
      snapshot: input.snapshot as unknown as CompanyConfigurationSnapshot,
      pricingVersion: input.configuration.pricingVersion
        ? {
            ...input.configuration.pricingVersion,
            status: "published",
            publishedAt: input.publishedAt.toISOString(),
            snapshot: null,
          }
        : null,
    });
  }
}

export function createTestNicheTemplate(): NicheTemplate {
  const serviceId = "10000000-0000-4000-8000-000000000101";

  return {
    id: "10000000-0000-4000-8000-000000000001",
    code: "cleaning_upholstery",
    name: "Limpeza de estofados",
    description: "Template completo do nicho piloto.",
    version: 2,
    services: [
      {
        id: serviceId,
        code: "upholstery_cleaning",
        name: "Higienizacao de estofados",
        description: "Servico principal do MVP piloto.",
        displayOrder: 10,
        isActiveDefault: true,
        defaultSchedulingMode: "required_with_proposal",
        pricingRules: [
          pricingRule(serviceId, 1, {
            code: "item_sofa_base",
            label: "Preco-base sofa",
            ruleType: "option_price",
            targetFieldCode: "item_type",
            targetOptionCode: "sofa",
            quantityFieldCode: "quantity",
            amountCents: 12000,
            unit: "unit",
            displayOrder: 10,
          }),
          pricingRule(serviceId, 11, {
            code: "sofa_seats_addition",
            label: "Adicional por lugar de sofa",
            ruleType: "quantity",
            targetFieldCode: "seats",
            quantityFieldCode: "quantity",
            amountCents: 2500,
            unit: "unit",
            condition: {
              sourceFieldCode: "item_type",
              operator: "equals",
              value: "sofa",
            },
            displayOrder: 30,
          }),
          pricingRule(serviceId, 12, {
            code: "size_large_multiplier",
            label: "Multiplicador tamanho grande",
            ruleType: "multiplier",
            multiplierBps: 12000,
            condition: {
              sourceFieldCode: "size",
              operator: "equals",
              value: "large",
            },
            displayOrder: 41,
          }),
          pricingRule(serviceId, 13, {
            code: "fabric_velvet_addition",
            label: "Adicional veludo",
            ruleType: "fixed_addition",
            quantityFieldCode: "quantity",
            amountCents: 2500,
            condition: {
              sourceFieldCode: "fabric_type",
              operator: "equals",
              value: "velvet",
            },
            displayOrder: 45,
          }),
          pricingRule(serviceId, 14, {
            code: "dirt_heavy_multiplier",
            label: "Multiplicador sujeira intensa",
            ruleType: "multiplier",
            multiplierBps: 13000,
            condition: {
              sourceFieldCode: "dirt_level",
              operator: "equals",
              value: "heavy",
            },
            displayOrder: 51,
          }),
          pricingRule(serviceId, 15, {
            code: "stains_addition",
            label: "Adicional por manchas",
            ruleType: "fixed_addition",
            quantityFieldCode: "quantity",
            amountCents: 3000,
            condition: {
              sourceFieldCode: "has_stains",
              operator: "equals",
              value: true,
            },
            displayOrder: 60,
          }),
          pricingRule(serviceId, 16, {
            code: "distance_fee",
            label: "Taxa de deslocamento",
            ruleType: "distance_fee",
            targetFieldCode: "distance_km",
            amountCents: 350,
            minimumValue: "10",
            unit: "km",
            displayOrder: 850,
          }),
          pricingRule(serviceId, 17, {
            code: "quantity_discount",
            label: "Desconto por quantidade",
            ruleType: "administrative_discount",
            targetFieldCode: "quantity",
            percentageBps: 500,
            minimumValue: "3",
            unit: "unit",
            displayOrder: 870,
          }),
          pricingRule(serviceId, 18, {
            code: "minimum_visit",
            label: "Valor minimo de visita",
            ruleType: "minimum_value",
            targetFieldCode: null,
            targetOptionCode: null,
            quantityFieldCode: null,
            amountCents: 12000,
            displayOrder: 900,
          }),
        ],
        fields: [
          field(1, {
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
            options: [
              option(1, "sofa", "Sofa", 10),
              option(2, "armchair", "Poltrona", 20),
              option(3, "chair", "Cadeira", 30),
              option(4, "mattress", "Colchao", 40),
            ],
          }),
          field(2, {
            code: "quantity",
            label: "Quantidade",
            fieldType: "number",
            displayOrder: 20,
            isRequiredDefault: true,
            isPricingRelevantDefault: true,
          }),
          field(3, {
            code: "size",
            label: "Tamanho",
            fieldType: "single_select",
            displayOrder: 30,
            isRequiredDefault: true,
            isPricingRelevantDefault: true,
            options: [
              option(101, "small", "Pequeno", 10),
              option(102, "medium", "Medio", 20),
              option(103, "large", "Grande", 30),
            ],
          }),
          field(4, {
            code: "seats",
            label: "Numero de lugares",
            fieldType: "number",
            helpText: "Exibido para sofas.",
            displayOrder: 40,
            isPricingRelevantDefault: true,
            condition: {
              sourceFieldCode: "item_type",
              operator: "equals",
              value: "sofa",
            },
          }),
          field(5, {
            code: "fabric_type",
            label: "Tipo de tecido",
            fieldType: "single_select",
            displayOrder: 50,
            isRequiredDefault: true,
            isPricingRelevantDefault: true,
            options: [
              option(201, "suede", "Suede", 10),
              option(202, "synthetic_leather", "Couro sintetico", 20),
              option(203, "linen", "Linho", 30),
              option(204, "velvet", "Veludo", 40),
              option(205, "other", "Outro", 50),
            ],
          }),
          field(6, {
            code: "dirt_level",
            label: "Nivel de sujeira",
            fieldType: "single_select",
            displayOrder: 60,
            isRequiredDefault: true,
            isPricingRelevantDefault: true,
            options: [
              option(301, "light", "Leve", 10),
              option(302, "medium", "Medio", 20),
              option(303, "heavy", "Intenso", 30),
            ],
          }),
          field(7, {
            code: "has_stains",
            label: "Possui manchas?",
            fieldType: "boolean",
            displayOrder: 70,
            isPricingRelevantDefault: true,
            options: [],
          }),
          field(8, {
            code: "stain_type",
            label: "Tipo de mancha",
            fieldType: "multi_select",
            helpText: "Exibido apenas quando ha manchas.",
            displayOrder: 80,
            isPricingRelevantDefault: true,
            condition: {
              sourceFieldCode: "has_stains",
              operator: "equals",
              value: true,
            },
            options: [
              option(401, "food", "Comida", 10),
              option(402, "beverage", "Bebida", 20),
              option(403, "ink", "Tinta", 30),
              option(404, "mold", "Mofo", 40),
              option(405, "other", "Outro", 50),
            ],
          }),
          field(9, {
            code: "odor",
            label: "Possui odor?",
            fieldType: "boolean",
            displayOrder: 90,
            isPricingRelevantDefault: true,
          }),
          field(10, {
            code: "pet_hair",
            label: "Possui pelos?",
            fieldType: "boolean",
            displayOrder: 100,
            isPricingRelevantDefault: true,
          }),
          field(11, {
            code: "pets_present",
            label: "Ha animais no local?",
            fieldType: "boolean",
            displayOrder: 110,
          }),
          field(12, {
            code: "waterproofing",
            label: "Deseja impermeabilizacao?",
            fieldType: "boolean",
            displayOrder: 120,
            isPricingRelevantDefault: true,
          }),
          field(13, {
            code: "urgency",
            label: "Urgencia",
            fieldType: "single_select",
            displayOrder: 130,
            isPricingRelevantDefault: true,
            options: [
              option(501, "normal", "Normal", 10),
              option(502, "urgent", "Urgente", 20),
            ],
          }),
          field(14, {
            code: "floor",
            label: "Andar",
            fieldType: "number",
            displayOrder: 140,
          }),
          field(15, {
            code: "has_elevator",
            label: "Possui elevador?",
            fieldType: "boolean",
            displayOrder: 150,
          }),
          field(16, {
            code: "parking",
            label: "Possui estacionamento?",
            fieldType: "boolean",
            displayOrder: 160,
          }),
          field(17, {
            code: "service_address",
            label: "Endereco do atendimento",
            fieldType: "address",
            displayOrder: 170,
            isRequiredDefault: true,
          }),
          field(18, {
            code: "photos",
            label: "Fotos",
            fieldType: "image",
            helpText: "Fotos ajudam a empresa a analisar o estofado.",
            displayOrder: 180,
            requiresPhotoDefault: true,
          }),
        ],
      },
    ],
  };
}

function field(
  index: number,
  input: Partial<TemplateField> &
    Pick<TemplateField, "code" | "fieldType" | "label" | "displayOrder">,
): TemplateField {
  return {
    id: `10000000-0000-4000-8000-000000001${String(index).padStart(3, "0")}`,
    helpText: null,
    isRequiredDefault: false,
    isActiveDefault: true,
    isClientVisibleDefault: true,
    isCompanyEditableDefault: true,
    isPricingRelevantDefault: false,
    requiresPhotoDefault: false,
    condition: null,
    options: [],
    ...input,
  };
}

function option(
  index: number,
  code: string,
  label: string,
  displayOrder: number,
): TemplateFieldOption {
  return {
    id: `10000000-0000-4000-8000-000000010${String(index).padStart(3, "0")}`,
    code,
    label,
    displayOrder,
    isActiveDefault: true,
  };
}

function pricingRule(
  templateServiceId: string,
  index: number,
  input: Partial<TemplatePricingRule> &
    Pick<TemplatePricingRule, "code" | "label" | "ruleType" | "displayOrder">,
): TemplatePricingRule {
  return {
    id: `10000000-0000-4000-8000-000000020${String(index).padStart(3, "0")}`,
    templateServiceId,
    targetFieldCode: null,
    targetOptionCode: null,
    quantityFieldCode: null,
    amountCents: null,
    percentageBps: null,
    multiplierBps: null,
    minimumValue: null,
    maximumValue: null,
    unit: null,
    condition: null,
    roundingMode: null,
    roundingIncrementCents: null,
    isActiveDefault: true,
    ...input,
  };
}
