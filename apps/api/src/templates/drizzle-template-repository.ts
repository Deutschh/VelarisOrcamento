import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
  auditLogs,
  companyConfigurations,
  companyFieldOptions,
  companyServiceFields,
  companyServices,
  nicheTemplates,
  templateFieldOptions,
  templateFields,
  templateServices,
} from "@velaris/database-schema";
import type {
  CompanyConfigurationDetail,
  CompanyConfigurationSnapshot,
  CompanyConfigurationStatus,
  CompanyFieldConfiguration,
  CompanyFieldOptionConfiguration,
  CompanyServiceConfiguration,
  NicheTemplate,
  PublicCompanyCategoryCode,
  TemplateField,
  TemplateFieldOption,
  TemplateService,
} from "@velaris/shared";

import type { createDatabaseClient } from "../db/client.js";
import type {
  PersistConfigurationInput,
  PublishConfigurationInput,
  TemplateRepository,
} from "./template-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class DrizzleTemplateRepository implements TemplateRepository {
  constructor(private readonly db: Database) {}

  async listTemplates(): Promise<NicheTemplate[]> {
    const templateRows = await this.db
      .select()
      .from(nicheTemplates)
      .where(eq(nicheTemplates.isActive, true))
      .orderBy(nicheTemplates.code);

    return this.mapTemplates(templateRows);
  }

  async findTemplateById(templateId: string): Promise<NicheTemplate | null> {
    const rows = await this.db
      .select()
      .from(nicheTemplates)
      .where(and(eq(nicheTemplates.id, templateId), eq(nicheTemplates.isActive, true)))
      .limit(1);

    const [template] = await this.mapTemplates(rows);
    return template ?? null;
  }

  async findCompanyConfigurationById(
    configurationId: string,
  ): Promise<CompanyConfigurationDetail | null> {
    const rows = await this.selectConfigurations(
      eq(companyConfigurations.id, configurationId),
    );
    const [configuration] = await this.mapConfigurations(rows);

    return configuration ?? null;
  }

  async findLatestCompanyConfiguration(input: {
    companyId: string;
    templateId: string;
    statuses?: CompanyConfigurationStatus[];
  }): Promise<CompanyConfigurationDetail | null> {
    const filters = [
      eq(companyConfigurations.companyId, input.companyId),
      eq(companyConfigurations.templateId, input.templateId),
      ...(input.statuses && input.statuses.length > 0
        ? [inArray(companyConfigurations.status, input.statuses)]
        : []),
    ];
    const whereClause = and(...filters);

    if (!whereClause) {
      return null;
    }

    const rows = await this.selectConfigurations(whereClause, 1);
    const [configuration] = await this.mapConfigurations(rows);

    return configuration ?? null;
  }

  async listCompanyConfigurations(
    companyId: string,
  ): Promise<CompanyConfigurationDetail[]> {
    const rows = await this.selectConfigurations(
      eq(companyConfigurations.companyId, companyId),
    );

    return this.mapConfigurations(rows);
  }

  async createDraftConfiguration(input: PersistConfigurationInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(companyConfigurations).values({
        id: input.configuration.id,
        companyId: input.configuration.companyId,
        templateId: input.configuration.templateId,
        status: input.configuration.status,
        version: input.configuration.version,
        configurationSnapshot: null,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        ...(input.createdFromConfigurationId
          ? { createdFromConfigurationId: input.createdFromConfigurationId }
          : {}),
      });

      await insertConfigurationTree(tx, input.configuration);
      await insertConfigurationAudit(tx, {
        action: "company.configuration.draft_created",
        actorUserId: input.actorUserId,
        companyId: input.configuration.companyId,
        configuration: input.configuration,
      });
    });
  }

  async replaceDraftConfiguration(input: PersistConfigurationInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(companyServices)
        .where(eq(companyServices.companyConfigurationId, input.configuration.id));
      await insertConfigurationTree(tx, input.configuration);
      await tx
        .update(companyConfigurations)
        .set({
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(companyConfigurations.id, input.configuration.id));
      await insertConfigurationAudit(tx, {
        action: "company.configuration.draft_updated",
        actorUserId: input.actorUserId,
        companyId: input.configuration.companyId,
        configuration: input.configuration,
      });
    });
  }

  async publishConfiguration(input: PublishConfigurationInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(companyConfigurations)
        .set({
          status: "archived",
          updatedAt: input.publishedAt,
          updatedByUserId: input.actorUserId,
        })
        .where(
          and(
            eq(companyConfigurations.companyId, input.configuration.companyId),
            eq(companyConfigurations.templateId, input.configuration.templateId),
            eq(companyConfigurations.status, "published"),
          ),
        );

      await tx
        .update(companyConfigurations)
        .set({
          status: "published",
          configurationSnapshot: input.snapshot,
          publishedAt: input.publishedAt,
          updatedAt: input.publishedAt,
          updatedByUserId: input.actorUserId,
        })
        .where(eq(companyConfigurations.id, input.configuration.id));

      await insertConfigurationAudit(tx, {
        action: "company.configuration.published",
        actorUserId: input.actorUserId,
        companyId: input.configuration.companyId,
        configuration: input.configuration,
      });
    });
  }

  private async selectConfigurations(whereClause: SQL, limit?: number) {
    const baseQuery = this.db
      .select({
        configuration: companyConfigurations,
        template: nicheTemplates,
      })
      .from(companyConfigurations)
      .innerJoin(nicheTemplates, eq(nicheTemplates.id, companyConfigurations.templateId))
      .where(whereClause)
      .orderBy(desc(companyConfigurations.version));

    return limit ? baseQuery.limit(limit) : baseQuery;
  }

  private async mapTemplates(
    templateRows: Array<typeof nicheTemplates.$inferSelect>,
  ): Promise<NicheTemplate[]> {
    if (templateRows.length === 0) {
      return [];
    }

    const templateIds = templateRows.map((template) => template.id);
    const serviceRows = await this.db
      .select()
      .from(templateServices)
      .where(inArray(templateServices.templateId, templateIds));
    const serviceIds = serviceRows.map((service) => service.id);
    const fieldRows =
      serviceIds.length > 0
        ? await this.db
            .select()
            .from(templateFields)
            .where(inArray(templateFields.templateServiceId, serviceIds))
        : [];
    const fieldIds = fieldRows.map((field) => field.id);
    const optionRows =
      fieldIds.length > 0
        ? await this.db
            .select()
            .from(templateFieldOptions)
            .where(inArray(templateFieldOptions.templateFieldId, fieldIds))
        : [];

    const optionsByFieldId = new Map<string, TemplateFieldOption[]>();
    for (const option of optionRows) {
      const options = optionsByFieldId.get(option.templateFieldId) ?? [];
      options.push({
        id: option.id,
        code: option.code,
        label: option.label,
        displayOrder: option.displayOrder,
        isActiveDefault: option.isActiveDefault,
      });
      optionsByFieldId.set(option.templateFieldId, options);
    }

    const fieldsByServiceId = new Map<string, TemplateField[]>();
    for (const field of fieldRows) {
      const fields = fieldsByServiceId.get(field.templateServiceId) ?? [];
      fields.push({
        id: field.id,
        code: field.code,
        label: field.label,
        fieldType: field.fieldType,
        helpText: field.helpText,
        displayOrder: field.displayOrder,
        isRequiredDefault: field.isRequiredDefault,
        isActiveDefault: field.isActiveDefault,
        isClientVisibleDefault: field.isClientVisibleDefault,
        isCompanyEditableDefault: field.isCompanyEditableDefault,
        isPricingRelevantDefault: field.isPricingRelevantDefault,
        requiresPhotoDefault: field.requiresPhotoDefault,
        condition: field.condition ?? null,
        options: (optionsByFieldId.get(field.id) ?? []).sort(byDisplayOrder),
      });
      fieldsByServiceId.set(field.templateServiceId, fields);
    }

    const servicesByTemplateId = new Map<string, TemplateService[]>();
    for (const service of serviceRows) {
      const services = servicesByTemplateId.get(service.templateId) ?? [];
      services.push({
        id: service.id,
        code: service.code,
        name: service.name,
        description: service.description,
        displayOrder: service.displayOrder,
        isActiveDefault: service.isActiveDefault,
        defaultSchedulingMode: service.defaultSchedulingMode,
        fields: (fieldsByServiceId.get(service.id) ?? []).sort(byDisplayOrder),
      });
      servicesByTemplateId.set(service.templateId, services);
    }

    return templateRows.map((template) => ({
      id: template.id,
      code: toKnownTemplateCode(template.code),
      name: template.name,
      description: template.description,
      version: template.version,
      services: (servicesByTemplateId.get(template.id) ?? []).sort(byDisplayOrder),
    }));
  }

  private async mapConfigurations(
    rows: ConfigurationRow[],
  ): Promise<CompanyConfigurationDetail[]> {
    if (rows.length === 0) {
      return [];
    }

    const configurationIds = rows.map((row) => row.configuration.id);
    const serviceRows = await this.db
      .select({
        companyService: companyServices,
        templateService: templateServices,
      })
      .from(companyServices)
      .innerJoin(
        templateServices,
        eq(templateServices.id, companyServices.templateServiceId),
      )
      .where(inArray(companyServices.companyConfigurationId, configurationIds));
    const serviceIds = serviceRows.map((row) => row.companyService.id);
    const fieldRows =
      serviceIds.length > 0
        ? await this.db
            .select({
              companyField: companyServiceFields,
              templateField: templateFields,
            })
            .from(companyServiceFields)
            .innerJoin(
              templateFields,
              eq(templateFields.id, companyServiceFields.templateFieldId),
            )
            .where(inArray(companyServiceFields.companyServiceId, serviceIds))
        : [];
    const fieldIds = fieldRows.map((row) => row.companyField.id);
    const optionRows =
      fieldIds.length > 0
        ? await this.db
            .select({
              companyOption: companyFieldOptions,
              templateOption: templateFieldOptions,
            })
            .from(companyFieldOptions)
            .innerJoin(
              templateFieldOptions,
              eq(templateFieldOptions.id, companyFieldOptions.templateFieldOptionId),
            )
            .where(inArray(companyFieldOptions.companyServiceFieldId, fieldIds))
        : [];

    const serviceById = new Map<string, CompanyServiceConfiguration>();
    const servicesByConfigurationId = new Map<string, CompanyServiceConfiguration[]>();

    for (const row of serviceRows) {
      const service: CompanyServiceConfiguration = {
        id: row.companyService.id,
        templateServiceId: row.companyService.templateServiceId,
        code: row.templateService.code,
        name: row.templateService.name,
        description: row.templateService.description,
        displayOrder: row.companyService.displayOrder,
        isActive: row.companyService.isActive,
        schedulingMode: row.companyService.schedulingMode,
        fields: [],
      };
      const services =
        servicesByConfigurationId.get(row.companyService.companyConfigurationId) ?? [];
      services.push(service);
      servicesByConfigurationId.set(row.companyService.companyConfigurationId, services);
      serviceById.set(service.id, service);
    }

    const fieldById = new Map<string, CompanyFieldConfiguration>();
    for (const row of fieldRows) {
      const field: CompanyFieldConfiguration = {
        id: row.companyField.id,
        templateFieldId: row.companyField.templateFieldId,
        code: row.templateField.code,
        label: row.templateField.label,
        fieldType: row.templateField.fieldType,
        helpText: row.companyField.helpText,
        displayOrder: row.companyField.displayOrder,
        isActive: row.companyField.isActive,
        isRequired: row.companyField.isRequired,
        isClientVisible: row.companyField.isClientVisible,
        isCompanyEditable: row.companyField.isCompanyEditable,
        isPricingRelevant: row.companyField.isPricingRelevant,
        requiresPhoto: row.companyField.requiresPhoto,
        condition: row.templateField.condition ?? null,
        options: [],
      };
      serviceById.get(row.companyField.companyServiceId)?.fields.push(field);
      fieldById.set(field.id, field);
    }

    for (const row of optionRows) {
      const option: CompanyFieldOptionConfiguration = {
        id: row.companyOption.id,
        templateFieldOptionId: row.companyOption.templateFieldOptionId,
        code: row.templateOption.code,
        label: row.templateOption.label,
        displayOrder: row.companyOption.displayOrder,
        isActive: row.companyOption.isActive,
      };
      fieldById.get(row.companyOption.companyServiceFieldId)?.options.push(option);
    }

    for (const service of serviceById.values()) {
      service.fields.sort(byDisplayOrder);
      for (const field of service.fields) {
        field.options.sort(byDisplayOrder);
      }
    }

    return rows.map((row) => ({
      id: row.configuration.id,
      companyId: row.configuration.companyId,
      templateId: row.configuration.templateId,
      templateCode: toKnownTemplateCode(row.template.code),
      templateName: row.template.name,
      status: row.configuration.status,
      version: row.configuration.version,
      publishedAt: row.configuration.publishedAt?.toISOString() ?? null,
      snapshot:
        (row.configuration
          .configurationSnapshot as CompanyConfigurationSnapshot | null) ?? null,
      services: (servicesByConfigurationId.get(row.configuration.id) ?? []).sort(
        byDisplayOrder,
      ),
    }));
  }
}

type ConfigurationRow = {
  configuration: typeof companyConfigurations.$inferSelect;
  template: typeof nicheTemplates.$inferSelect;
};

async function insertConfigurationTree(
  tx: Transaction,
  configuration: CompanyConfigurationDetail,
) {
  for (const service of configuration.services) {
    await tx.insert(companyServices).values({
      id: service.id,
      companyConfigurationId: configuration.id,
      templateServiceId: service.templateServiceId,
      isActive: service.isActive,
      schedulingMode: service.schedulingMode,
      displayOrder: service.displayOrder,
    });

    for (const field of service.fields) {
      await tx.insert(companyServiceFields).values({
        id: field.id,
        companyServiceId: service.id,
        templateFieldId: field.templateFieldId,
        isActive: field.isActive,
        isRequired: field.isRequired,
        isClientVisible: field.isClientVisible,
        isCompanyEditable: field.isCompanyEditable,
        isPricingRelevant: field.isPricingRelevant,
        requiresPhoto: field.requiresPhoto,
        displayOrder: field.displayOrder,
        helpText: field.helpText,
      });

      for (const option of field.options) {
        await tx.insert(companyFieldOptions).values({
          id: option.id,
          companyServiceFieldId: field.id,
          templateFieldOptionId: option.templateFieldOptionId,
          isActive: option.isActive,
          displayOrder: option.displayOrder,
        });
      }
    }
  }
}

async function insertConfigurationAudit(
  tx: Transaction,
  input: {
    action: string;
    actorUserId: string;
    companyId: string;
    configuration: CompanyConfigurationDetail;
  },
) {
  await tx.insert(auditLogs).values({
    id: randomUUID(),
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    action: input.action,
    entityType: "company_configuration",
    entityId: input.configuration.id,
    metadata: {
      templateCode: input.configuration.templateCode,
      version: input.configuration.version,
      status: input.configuration.status,
    },
  });
}

function toKnownTemplateCode(value: string): PublicCompanyCategoryCode {
  if (value === "glasswork" || value === "stonework") {
    return value;
  }

  return "cleaning_upholstery";
}

function byDisplayOrder<T extends { displayOrder: number }>(left: T, right: T) {
  return left.displayOrder - right.displayOrder;
}
