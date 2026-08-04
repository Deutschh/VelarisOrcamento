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
export const pricingRuleTypeEnum = pgEnum("pricing_rule_type", [
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
]);
export const pricingRuleUnitEnum = pgEnum("pricing_rule_unit", [
  "unit",
  "m",
  "m2",
  "linear_m",
  "km",
]);
export const roundingModeEnum = pgEnum("rounding_mode", ["nearest", "up", "down"]);
export const companyConfigurationStatusEnum = pgEnum("company_configuration_status", [
  "draft",
  "published",
  "archived",
]);
export const quoteRequestStatusEnum = pgEnum("quote_request_status", [
  "draft",
  "submitted",
  "under_review",
  "awaiting_information",
  "accepted_for_proposal",
  "declined_by_company",
  "cancelled",
  "archived",
]);
export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);
export const quoteVersionStatusEnum = pgEnum("quote_version_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "superseded",
]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "none",
  "proposed",
  "confirmed",
  "reschedule_requested",
  "rescheduled",
  "completed",
  "cancelled",
]);
export const serviceStatusEnum = pgEnum("service_status", [
  "not_started",
  "scheduled",
  "in_progress",
  "service_realized",
  "closed",
]);
export const reviewStatusEnum = pgEnum("review_status", ["visible", "hidden"]);
export const priceChangeRequestStatusEnum = pgEnum("price_change_request_status", [
  "open",
  "under_review",
  "approved",
  "rejected",
  "implemented",
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

export const customerFavoriteCompanies = pgTable(
  "customer_favorite_companies",
  {
    id: uuid("id").primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerCompanyUnique: uniqueIndex(
      "customer_favorite_companies_customer_company_unique",
    ).on(table.customerId, table.companyId),
    customerIdx: index("customer_favorite_companies_customer_idx").on(table.customerId),
    companyIdx: index("customer_favorite_companies_company_idx").on(table.companyId),
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

export const templatePricingRules = pgTable(
  "template_pricing_rules",
  {
    id: uuid("id").primaryKey(),
    templateServiceId: uuid("template_service_id")
      .notNull()
      .references(() => templateServices.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    ruleType: pricingRuleTypeEnum("rule_type").notNull(),
    targetFieldCode: text("target_field_code"),
    targetOptionCode: text("target_option_code"),
    quantityFieldCode: text("quantity_field_code"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    percentageBps: integer("percentage_bps"),
    multiplierBps: integer("multiplier_bps"),
    minimumValue: numeric("minimum_value", { precision: 12, scale: 4 }),
    maximumValue: numeric("maximum_value", { precision: 12, scale: 4 }),
    unit: pricingRuleUnitEnum("unit"),
    condition: jsonb("condition").$type<{
      sourceFieldCode: string;
      operator: "equals" | "not_equals" | "includes";
      value: string | number | boolean | string[] | number[];
    }>(),
    roundingMode: roundingModeEnum("rounding_mode"),
    roundingIncrementCents: integer("rounding_increment_cents"),
    isActiveDefault: boolean("is_active_default").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    serviceCodeUnique: uniqueIndex("template_pricing_rules_service_code_unique").on(
      table.templateServiceId,
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

export const companyPricingVersions = pgTable(
  "company_pricing_versions",
  {
    id: uuid("id").primaryKey(),
    companyConfigurationId: uuid("company_configuration_id")
      .notNull()
      .references(() => companyConfigurations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => nicheTemplates.id, { onDelete: "restrict" }),
    status: companyConfigurationStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull(),
    pricingSnapshot: jsonb("pricing_snapshot").$type<Record<string, unknown> | null>(),
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
    configurationUnique: uniqueIndex("company_pricing_versions_configuration_unique").on(
      table.companyConfigurationId,
    ),
    companyTemplateVersionUnique: uniqueIndex(
      "company_pricing_versions_company_template_version_unique",
    ).on(table.companyId, table.templateId, table.version),
  }),
);

export const companyPricingRules = pgTable(
  "company_pricing_rules",
  {
    id: uuid("id").primaryKey(),
    companyPricingVersionId: uuid("company_pricing_version_id")
      .notNull()
      .references(() => companyPricingVersions.id, { onDelete: "cascade" }),
    companyServiceId: uuid("company_service_id")
      .notNull()
      .references(() => companyServices.id, { onDelete: "cascade" }),
    templatePricingRuleId: uuid("template_pricing_rule_id").references(
      () => templatePricingRules.id,
      { onDelete: "restrict" },
    ),
    code: text("code").notNull(),
    label: text("label").notNull(),
    ruleType: pricingRuleTypeEnum("rule_type").notNull(),
    targetFieldCode: text("target_field_code"),
    targetOptionCode: text("target_option_code"),
    quantityFieldCode: text("quantity_field_code"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    percentageBps: integer("percentage_bps"),
    multiplierBps: integer("multiplier_bps"),
    minimumValue: numeric("minimum_value", { precision: 12, scale: 4 }),
    maximumValue: numeric("maximum_value", { precision: 12, scale: 4 }),
    unit: pricingRuleUnitEnum("unit"),
    condition: jsonb("condition").$type<{
      sourceFieldCode: string;
      operator: "equals" | "not_equals" | "includes";
      value: string | number | boolean | string[] | number[];
    }>(),
    roundingMode: roundingModeEnum("rounding_mode"),
    roundingIncrementCents: integer("rounding_increment_cents"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    versionServiceCodeUnique: uniqueIndex(
      "company_pricing_rules_version_service_code_unique",
    ).on(table.companyPricingVersionId, table.companyServiceId, table.code),
  }),
);

export const publicAccessTokens = pgTable(
  "public_access_tokens",
  {
    id: uuid("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("public_access_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
    entityIdx: index("public_access_tokens_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
  }),
);

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: uuid("id").primaryKey(),
    requestCode: text("request_code"),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    companyConfigurationId: uuid("company_configuration_id")
      .notNull()
      .references(() => companyConfigurations.id, { onDelete: "restrict" }),
    companyServiceId: uuid("company_service_id")
      .notNull()
      .references(() => companyServices.id, { onDelete: "restrict" }),
    companyPricingVersionId: uuid("company_pricing_version_id").references(
      () => companyPricingVersions.id,
      { onDelete: "set null" },
    ),
    customerId: uuid("customer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: quoteRequestStatusEnum("status").notNull().default("draft"),
    draftTokenHash: text("draft_token_hash"),
    publicTokenId: uuid("public_token_id").references(() => publicAccessTokens.id, {
      onDelete: "set null",
    }),
    requestData: jsonb("request_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    configurationSnapshot: jsonb("configuration_snapshot").$type<Record<
      string,
      unknown
    > | null>(),
    legalSnapshot: jsonb("legal_snapshot").$type<Record<string, unknown> | null>(),
    calculationSnapshot: jsonb("calculation_snapshot").$type<Record<
      string,
      unknown
    > | null>(),
    internalTotal: numeric("internal_total", { precision: 12, scale: 2 }),
    estimateMin: numeric("estimate_min", { precision: 12, scale: 2 }),
    estimateMax: numeric("estimate_max", { precision: 12, scale: 2 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => ({
    requestCodeUnique: uniqueIndex("quote_requests_request_code_unique").on(
      table.requestCode,
    ),
    draftTokenHashUnique: uniqueIndex("quote_requests_draft_token_hash_unique").on(
      table.draftTokenHash,
    ),
    companyStatusIdx: index("quote_requests_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    expiresAtIdx: index("quote_requests_expires_at_idx").on(table.expiresAt),
  }),
);

export const quoteRequestAnswers = pgTable(
  "quote_request_answers",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    itemId: text("item_id"),
    fieldCode: text("field_code").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    originalValue: text("original_value"),
    originalUnit: text("original_unit"),
    normalizedValue: numeric("normalized_value", { precision: 12, scale: 4 }),
    normalizedUnit: pricingRuleUnitEnum("normalized_unit"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    requestFieldUnique: uniqueIndex("quote_request_answers_request_field_unique").on(
      table.quoteRequestId,
      table.itemId,
      table.fieldCode,
    ),
    requestIdx: index("quote_request_answers_request_idx").on(table.quoteRequestId),
  }),
);

export const quoteRequestAnswerRevisions = pgTable(
  "quote_request_answer_revisions",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    itemId: text("item_id"),
    fieldCode: text("field_code").notNull(),
    originalValue: jsonb("original_value").$type<unknown>().notNull(),
    revisedValue: jsonb("revised_value").$type<unknown>().notNull(),
    reason: text("reason"),
    impactAmount: numeric("impact_amount", { precision: 12, scale: 2 }),
    configurationVersion: integer("configuration_version").notNull(),
    pricingVersion: integer("pricing_version").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: index("quote_request_answer_revisions_request_idx").on(
      table.quoteRequestId,
    ),
  }),
);

export const quoteRequestEvents = pgTable(
  "quote_request_events",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    fromStatus: quoteRequestStatusEnum("from_status"),
    toStatus: quoteRequestStatusEnum("to_status"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: index("quote_request_events_request_idx").on(table.quoteRequestId),
  }),
);

export const quoteRequestFiles = pgTable(
  "quote_request_files",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    itemId: text("item_id"),
    fieldCode: text("field_code"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageProvider: text("storage_provider").notNull().default("stub"),
    storageKey: text("storage_key"),
    status: text("status").notNull().default("metadata_received"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    requestIdx: index("quote_request_files_request_idx").on(table.quoteRequestId),
  }),
);

export const quoteRequestCalculations = pgTable(
  "quote_request_calculations",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    calculationSnapshot: jsonb("calculation_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    internalTotal: numeric("internal_total", { precision: 12, scale: 2 }).notNull(),
    estimateMin: numeric("estimate_min", { precision: 12, scale: 2 }).notNull(),
    estimateMax: numeric("estimate_max", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: index("quote_request_calculations_request_idx").on(table.quoteRequestId),
  }),
);

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    requestCode: text("request_code").notNull(),
    contactType: text("contact_type").notNull(),
    contactHash: text("contact_hash").notNull(),
    tokenHash: text("token_hash").notNull(),
    otpHash: text("otp_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("recovery_codes_token_hash_unique").on(table.tokenHash),
    requestIdx: index("recovery_codes_request_idx").on(table.quoteRequestId),
    requestCodeIdx: index("recovery_codes_request_code_idx").on(table.requestCode),
    expiresAtIdx: index("recovery_codes_expires_at_idx").on(table.expiresAt),
  }),
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    status: quoteStatusEnum("status").notNull().default("draft"),
    acceptedQuoteVersionId: uuid("accepted_quote_version_id"),
    ...timestamps,
  },
  (table) => ({
    requestUnique: uniqueIndex("quotes_quote_request_unique").on(table.quoteRequestId),
    companyStatusIdx: index("quotes_company_status_idx").on(
      table.companyId,
      table.status,
    ),
  }),
);

export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: uuid("id").primaryKey(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    proposalCode: text("proposal_code").notNull(),
    status: quoteVersionStatusEnum("status").notNull().default("draft"),
    internalTotal: numeric("internal_total", { precision: 12, scale: 2 }).notNull(),
    estimateMin: numeric("estimate_min", { precision: 12, scale: 2 }).notNull(),
    estimateMax: numeric("estimate_max", { precision: 12, scale: 2 }).notNull(),
    finalTotal: numeric("final_total", { precision: 12, scale: 2 }).notNull(),
    outOfRangeReason: text("out_of_range_reason"),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    terms: text("terms"),
    termsVersion: text("terms_version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sentByUserId: uuid("sent_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    quoteVersionUnique: uniqueIndex("quote_versions_quote_version_unique").on(
      table.quoteId,
      table.versionNumber,
    ),
    proposalCodeUnique: uniqueIndex("quote_versions_proposal_code_unique").on(
      table.proposalCode,
    ),
    requestIdx: index("quote_versions_request_idx").on(table.quoteRequestId),
    companyStatusIdx: index("quote_versions_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    validUntilIdx: index("quote_versions_valid_until_idx").on(table.validUntil),
  }),
);

export const quoteVersionItems = pgTable(
  "quote_version_items",
  {
    id: uuid("id").primaryKey(),
    quoteVersionId: uuid("quote_version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "cascade" }),
    itemId: text("item_id"),
    label: text("label").notNull(),
    quantity: integer("quantity").notNull(),
    internalTotal: numeric("internal_total", { precision: 12, scale: 2 }).notNull(),
    finalTotal: numeric("final_total", { precision: 12, scale: 2 }).notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    versionIdx: index("quote_version_items_version_idx").on(table.quoteVersionId),
  }),
);

export const quoteVersionEvents = pgTable(
  "quote_version_events",
  {
    id: uuid("id").primaryKey(),
    quoteVersionId: uuid("quote_version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    fromStatus: quoteVersionStatusEnum("from_status"),
    toStatus: quoteVersionStatusEnum("to_status"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    versionIdx: index("quote_version_events_version_idx").on(table.quoteVersionId),
  }),
);

export const quoteAcceptances = pgTable(
  "quote_acceptances",
  {
    id: uuid("id").primaryKey(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    quoteVersionId: uuid("quote_version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "restrict" }),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requestCode: text("request_code").notNull(),
    proposalCode: text("proposal_code").notNull(),
    customerName: text("customer_name").notNull(),
    customerWhatsapp: text("customer_whatsapp").notNull(),
    customerEmail: text("customer_email"),
    finalTotal: numeric("final_total", { precision: 12, scale: 2 }).notNull(),
    termsVersion: text("terms_version").notNull(),
    privacyPolicyVersion: text("privacy_policy_version").notNull(),
    estimateDisclaimerVersion: text("estimate_disclaimer_version").notNull(),
    companyTermsVersion: text("company_terms_version"),
    legalSnapshot: jsonb("legal_snapshot").$type<Record<string, unknown>>().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quoteVersionUnique: uniqueIndex("quote_acceptances_quote_version_unique").on(
      table.quoteVersionId,
    ),
    idempotencyKeyUnique: uniqueIndex("quote_acceptances_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    quoteIdx: index("quote_acceptances_quote_idx").on(table.quoteId),
    requestIdx: index("quote_acceptances_request_idx").on(table.quoteRequestId),
    companyIdx: index("quote_acceptances_company_idx").on(table.companyId),
  }),
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    quoteVersionId: uuid("quote_version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "cascade" }),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    status: appointmentStatusEnum("status").notNull().default("proposed"),
    serviceStatus: serviceStatusEnum("service_status").notNull().default("not_started"),
    schedulingMode: schedulingModeEnum("scheduling_mode").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes").notNull(),
    timezone: text("timezone").notNull(),
    address: text("address"),
    addressSnapshot: jsonb("address_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    conflictWarning: jsonb("conflict_warning")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    proposedByUserId: uuid("proposed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    quoteIdx: index("appointments_quote_idx").on(table.quoteId),
    requestIdx: index("appointments_request_idx").on(table.quoteRequestId),
    companyTimeIdx: index("appointments_company_time_idx").on(
      table.companyId,
      table.startsAt,
    ),
    companyStatusIdx: index("appointments_company_status_idx").on(
      table.companyId,
      table.status,
    ),
  }),
);

export const appointmentHistory = pgTable(
  "appointment_history",
  {
    id: uuid("id").primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorType: text("actor_type").notNull().default("company"),
    eventType: text("event_type").notNull(),
    fromStatus: appointmentStatusEnum("from_status"),
    toStatus: appointmentStatusEnum("to_status"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    appointmentIdx: index("appointment_history_appointment_idx").on(table.appointmentId),
  }),
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    quoteVersionId: uuid("quote_version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "restrict" }),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "restrict" }),
    customerProfileId: uuid("customer_profile_id").references(() => customerProfiles.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    requestCode: text("request_code").notNull(),
    proposalCode: text("proposal_code").notNull(),
    serviceName: text("service_name").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    status: reviewStatusEnum("status").notNull().default("visible"),
    isSuspicious: boolean("is_suspicious").notNull().default(false),
    moderationReason: text("moderation_reason"),
    moderatedByUserId: uuid("moderated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    appointmentUnique: uniqueIndex("reviews_appointment_unique").on(table.appointmentId),
    companyStatusIdx: index("reviews_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    requestIdx: index("reviews_request_idx").on(table.quoteRequestId),
  }),
);

export const priceChangeRequests = pgTable(
  "company_price_change_requests",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    serviceId: uuid("service_id").references(() => companyServices.id, {
      onDelete: "set null",
    }),
    status: priceChangeRequestStatusEnum("status").notNull().default("open"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    resolutionNote: text("resolution_note"),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    companyStatusIdx: index("company_price_change_requests_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    statusIdx: index("company_price_change_requests_status_idx").on(table.status),
    createdAtIdx: index("company_price_change_requests_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    companyReadIdx: index("notifications_company_read_idx").on(
      table.companyId,
      table.readAt,
    ),
    entityIdx: index("notifications_entity_idx").on(table.entityType, table.entityId),
  }),
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>().notNull(),
    statusCode: integer("status_code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scopeKeyUnique: uniqueIndex("idempotency_keys_scope_key_unique").on(
      table.scope,
      table.key,
    ),
    expiresAtIdx: index("idempotency_keys_expires_at_idx").on(table.expiresAt),
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
