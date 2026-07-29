import { z } from "zod";
import { companyProfileStatusSchema, companyStatusSchema } from "./auth.js";
import type { CompanyConfigurationDetail } from "./templates.js";
import type { CompanyPublicProfileSettings } from "./public.js";

export const internalNoteRequestSchema = z.object({
  note: z.string().trim().min(2).max(2000),
});

export type InternalNoteRequest = z.infer<typeof internalNoteRequestSchema>;

export const adminCompanyActionRequestSchema = z.object({
  note: z.string().trim().min(2).max(2000).optional(),
});

export type AdminCompanyActionRequest = z.infer<typeof adminCompanyActionRequestSchema>;

export const adminPublishCompanyRequestSchema = adminCompanyActionRequestSchema.extend({
  published: z.boolean(),
});

export type AdminPublishCompanyRequest = z.infer<typeof adminPublishCompanyRequestSchema>;

export const adminCompanyListQuerySchema = z.object({
  status: companyStatusSchema.optional(),
  profileStatus: companyProfileStatusSchema.optional(),
});

export type AdminCompanyListQuery = z.infer<typeof adminCompanyListQuerySchema>;

export interface AdminCompanySummary {
  id: string;
  tradingName: string;
  slug: string;
  status: z.infer<typeof companyStatusSchema>;
  profileStatus: z.infer<typeof companyProfileStatusSchema>;
  subscriptionStatus: "pending_activation" | "active" | "suspended" | "cancelled";
  ownerName: string | null;
  ownerEmail: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  profilePublishedAt: string | null;
  createdAt: string;
}

export interface AdminCompanyDetail extends AdminCompanySummary {
  legalName: string | null;
  documentNumber: string | null;
  timezone: string;
  publicProfile: CompanyPublicProfileSettings;
  configurations: CompanyConfigurationDetail[];
  notes: AdminCompanyNote[];
  auditLogs: AdminAuditLog[];
}

export interface AdminCompanyNote {
  id: string;
  note: string;
  authorName: string | null;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
