import type {
  CompanyConfigurationDetail,
  CompanyConfigurationStatus,
  NicheTemplate,
} from "@velaris/shared";

export interface PersistConfigurationInput {
  configuration: CompanyConfigurationDetail;
  actorUserId: string;
  createdFromConfigurationId?: string;
}

export interface PublishConfigurationInput {
  configuration: CompanyConfigurationDetail;
  snapshot: Record<string, unknown>;
  actorUserId: string;
  publishedAt: Date;
}

export interface TemplateRepository {
  listTemplates(): Promise<NicheTemplate[]>;
  findTemplateById(templateId: string): Promise<NicheTemplate | null>;
  findCompanyConfigurationById(
    configurationId: string,
  ): Promise<CompanyConfigurationDetail | null>;
  findLatestCompanyConfiguration(input: {
    companyId: string;
    templateId: string;
    statuses?: CompanyConfigurationStatus[];
  }): Promise<CompanyConfigurationDetail | null>;
  listCompanyConfigurations(companyId: string): Promise<CompanyConfigurationDetail[]>;
  createDraftConfiguration(input: PersistConfigurationInput): Promise<void>;
  replaceDraftConfiguration(input: PersistConfigurationInput): Promise<void>;
  publishConfiguration(input: PublishConfigurationInput): Promise<void>;
}
