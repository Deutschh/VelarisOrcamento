import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "company", "admin"]);
export const companyStatusEnum = pgEnum("company_status", [
  "pending",
  "active",
  "suspended",
]);
export const companyProfileStatusEnum = pgEnum("company_profile_status", [
  "draft",
  "published",
  "unpublished",
]);
export const companyMemberRoleEnum = pgEnum("company_member_role", [
  "owner",
  "manager",
  "operator",
]);
export const companyMemberStatusEnum = pgEnum("company_member_status", [
  "active",
  "inactive",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending_activation",
  "active",
  "suspended",
  "cancelled",
]);
export const legalDocumentTypeEnum = pgEnum("legal_document_type", [
  "terms_of_use",
  "privacy_policy",
  "estimate_disclaimer",
  "company_terms",
]);
export const templateFieldTypeEnum = pgEnum("template_field_type", [
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
export const schedulingModeEnum = pgEnum("scheduling_mode", [
  "required_with_proposal",
  "optional_with_proposal",
  "after_proposal_acceptance",
  "external_only",
]);
export const companyConfigurationStatusEnum = pgEnum("company_configuration_status", [
  "draft",
  "published",
  "archived",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
  }),
);

export const customerProfiles = pgTable(
  "customer_profiles",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => ({
    userUnique: uniqueIndex("customer_profiles_user_unique").on(table.userId),
  }),
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    codeUnique: uniqueIndex("plans_code_unique").on(table.code),
  }),
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey(),
    tradingName: text("trading_name").notNull(),
    legalName: text("legal_name"),
    documentNumber: text("document_number"),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    status: companyStatusEnum("status").notNull().default("pending"),
    profileStatus: companyProfileStatusEnum("profile_status").notNull().default("draft"),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("pending_activation"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
    profilePublishedAt: timestamp("profile_published_at", { withTimezone: true }),
    profileUnpublishedAt: timestamp("profile_unpublished_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    slugUnique: uniqueIndex("companies_slug_unique").on(table.slug),
    statusIdx: index("companies_status_idx").on(table.status),
  }),
);

export const companyPublicProfiles = pgTable(
  "company_public_profiles",
  {
    companyId: uuid("company_id")
      .primaryKey()
      .references(() => companies.id, { onDelete: "cascade" }),
    nicheCode: text("niche_code").notNull().default("cleaning_upholstery"),
    headline: text("headline"),
    description: text("description"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    neighborhood: text("neighborhood"),
    addressLine: text("address_line"),
    addressComplement: text("address_complement"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    serviceRadiusKm: numeric("service_radius_km", { precision: 8, scale: 2 }),
    serviceCities: jsonb("service_cities")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    serviceNeighborhoods: jsonb("service_neighborhoods")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),
    primaryColor: text("primary_color"),
    contactPhone: text("contact_phone"),
    contactWhatsapp: text("contact_whatsapp"),
    contactEmail: text("contact_email"),
    websiteUrl: text("website_url"),
    instagramUrl: text("instagram_url"),
    terms: text("terms"),
    gallery: jsonb("gallery")
      .$type<Array<{ url: string; alt?: string | undefined }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    services: jsonb("services")
      .$type<Array<{ name: string; description?: string | undefined }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    reviewAverage: numeric("review_average", { precision: 3, scale: 2 }),
    reviewCount: integer("review_count").notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    nicheIdx: index("company_public_profiles_niche_idx").on(table.nicheCode),
    cityIdx: index("company_public_profiles_city_idx").on(table.city),
  }),
);

export const nicheTemplates = pgTable(
  "niche_templates",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    codeUnique: uniqueIndex("niche_templates_code_unique").on(table.code),
  }),
);

export const templateServices = pgTable(
  "template_services",
  {
    id: uuid("id").primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => nicheTemplates.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isActiveDefault: boolean("is_active_default").notNull().default(true),
    defaultSchedulingMode: schedulingModeEnum("default_scheduling_mode")
      .notNull()
      .default("required_with_proposal"),
    ...timestamps,
  },
  (table) => ({
    templateCodeUnique: uniqueIndex("template_services_template_code_unique").on(
      table.templateId,
      table.code,
    ),
  }),
);

export const templateFields = pgTable(
  "template_fields",
  {
    id: uuid("id").primaryKey(),
    templateServiceId: uuid("template_service_id")
      .notNull()
      .references(() => templateServices.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    fieldType: templateFieldTypeEnum("field_type").notNull(),
    helpText: text("help_text"),
    displayOrder: integer("display_order").notNull().default(0),
    isRequiredDefault: boolean("is_required_default").notNull().default(false),
    isActiveDefault: boolean("is_active_default").notNull().default(true),
    isClientVisibleDefault: boolean("is_client_visible_default").notNull().default(true),
    isCompanyEditableDefault: boolean("is_company_editable_default")
      .notNull()
      .default(true),
    isPricingRelevantDefault: boolean("is_pricing_relevant_default")
      .notNull()
      .default(false),
    requiresPhotoDefault: boolean("requires_photo_default").notNull().default(false),
    condition: jsonb("condition").$type<{
      sourceFieldCode: string;
      operator: "equals" | "not_equals" | "includes";
      value: string | number | boolean | string[] | number[];
    }>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    serviceCodeUnique: uniqueIndex("template_fields_service_code_unique").on(
      table.templateServiceId,
      table.code,
    ),
  }),
);

export const templateFieldOptions = pgTable(
  "template_field_options",
  {
    id: uuid("id").primaryKey(),
    templateFieldId: uuid("template_field_id")
      .notNull()
      .references(() => templateFields.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActiveDefault: boolean("is_active_default").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    fieldCodeUnique: uniqueIndex("template_field_options_field_code_unique").on(
      table.templateFieldId,
      table.code,
    ),
  }),
);

export const companyConfigurations = pgTable(
  "company_configurations",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => nicheTemplates.id, { onDelete: "restrict" }),
    status: companyConfigurationStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull(),
    configurationSnapshot: jsonb("configuration_snapshot").$type<Record<
      string,
      unknown
    > | null>(),
    createdFromConfigurationId: uuid("created_from_configuration_id"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    companyIdx: index("company_configurations_company_idx").on(table.companyId),
    companyTemplateVersionUnique: uniqueIndex(
      "company_configurations_company_template_version_unique",
    ).on(table.companyId, table.templateId, table.version),
  }),
);

export const companyServices = pgTable(
  "company_services",
  {
    id: uuid("id").primaryKey(),
    companyConfigurationId: uuid("company_configuration_id")
      .notNull()
      .references(() => companyConfigurations.id, { onDelete: "cascade" }),
    templateServiceId: uuid("template_service_id")
      .notNull()
      .references(() => templateServices.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    schedulingMode: schedulingModeEnum("scheduling_mode")
      .notNull()
      .default("required_with_proposal"),
    displayOrder: integer("display_order").notNull().default(0),
    estimateMarginLower: numeric("estimate_margin_lower", {
      precision: 6,
      scale: 2,
    }),
    estimateMarginUpper: numeric("estimate_margin_upper", {
      precision: 6,
      scale: 2,
    }),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    ...timestamps,
  },
  (table) => ({
    configurationServiceUnique: uniqueIndex(
      "company_services_configuration_service_unique",
    ).on(table.companyConfigurationId, table.templateServiceId),
  }),
);

export const companyServiceFields = pgTable(
  "company_service_fields",
  {
    id: uuid("id").primaryKey(),
    companyServiceId: uuid("company_service_id")
      .notNull()
      .references(() => companyServices.id, { onDelete: "cascade" }),
    templateFieldId: uuid("template_field_id")
      .notNull()
      .references(() => templateFields.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    isRequired: boolean("is_required").notNull().default(false),
    isClientVisible: boolean("is_client_visible").notNull().default(true),
    isCompanyEditable: boolean("is_company_editable").notNull().default(true),
    isPricingRelevant: boolean("is_pricing_relevant").notNull().default(false),
    requiresPhoto: boolean("requires_photo").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    helpText: text("help_text"),
    ...timestamps,
  },
  (table) => ({
    serviceFieldUnique: uniqueIndex("company_service_fields_service_field_unique").on(
      table.companyServiceId,
      table.templateFieldId,
    ),
  }),
);

export const companyFieldOptions = pgTable(
  "company_field_options",
  {
    id: uuid("id").primaryKey(),
    companyServiceFieldId: uuid("company_service_field_id")
      .notNull()
      .references(() => companyServiceFields.id, { onDelete: "cascade" }),
    templateFieldOptionId: uuid("template_field_option_id")
      .notNull()
      .references(() => templateFieldOptions.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    fieldOptionUnique: uniqueIndex("company_field_options_field_option_unique").on(
      table.companyServiceFieldId,
      table.templateFieldOptionId,
    ),
  }),
);

export const companyMembers = pgTable(
  "company_members",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: companyMemberRoleEnum("role").notNull(),
    status: companyMemberStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => ({
    companyUserUnique: uniqueIndex("company_members_company_user_unique").on(
      table.companyId,
      table.userId,
    ),
    companyIdx: index("company_members_company_idx").on(table.companyId),
    userIdx: index("company_members_user_idx").on(table.userId),
  }),
);

export const companySubscriptions = pgTable("company_subscriptions", {
  id: uuid("id").primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  status: subscriptionStatusEnum("status").notNull().default("pending_activation"),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  ...timestamps,
});

export const companyInternalNotes = pgTable(
  "company_internal_notes",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note").notNull(),
    ...timestamps,
  },
  (table) => ({
    companyIdx: index("company_internal_notes_company_idx").on(table.companyId),
  }),
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    ...timestamps,
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
  }),
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("email_verification_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("password_reset_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
  }),
);

export const legalDocumentVersions = pgTable(
  "legal_document_versions",
  {
    id: uuid("id").primaryKey(),
    type: legalDocumentTypeEnum("type").notNull(),
    version: text("version").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    typeVersionUnique: uniqueIndex("legal_document_versions_type_version_unique").on(
      table.type,
      table.version,
    ),
  }),
);

export const legalAcceptances = pgTable(
  "legal_acceptances",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => legalDocumentVersions.id, { onDelete: "restrict" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => ({
    userDocumentIdx: index("legal_acceptances_user_document_idx").on(
      table.userId,
      table.documentVersionId,
    ),
  }),
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
