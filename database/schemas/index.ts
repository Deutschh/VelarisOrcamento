import { sql } from "drizzle-orm";
import {
  boolean,
  index,
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
