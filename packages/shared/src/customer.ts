import { z } from "zod";

import type { AppointmentStatus } from "./appointments.js";
import type { PublicCompanyCategoryCode, PublicCompanyReviewSummary } from "./public.js";
import type { QuoteRequestStatus } from "./quote-requests.js";
import type { ServiceStatus } from "./reviews.js";
import type { QuoteStatus, QuoteVersionStatus } from "./proposals.js";

export const customerFavoriteCompanyRequestSchema = z.object({
  companyId: z.string().uuid(),
});

export type CustomerFavoriteCompanyRequest = z.infer<
  typeof customerFavoriteCompanyRequestSchema
>;

export const customerProfileUpdateRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(40).optional(),
  avatarUrl: z.string().trim().url().optional(),
});

export type CustomerProfileUpdateRequest = z.infer<
  typeof customerProfileUpdateRequestSchema
>;

export interface CustomerProfileSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
}

export interface CustomerCompanySummary {
  id: string;
  tradingName: string;
  slug: string;
  nicheCode: PublicCompanyCategoryCode;
  nicheLabel: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  reviewSummary: PublicCompanyReviewSummary;
}

export interface CustomerQuoteRequestSummary {
  id: string;
  requestCode: string;
  status: QuoteRequestStatus;
  company: CustomerCompanySummary;
  serviceName: string;
  itemCount: number;
  estimateMinCents: number | null;
  estimateMaxCents: number | null;
  submittedAt: string;
  updatedAt: string;
}

export interface CustomerProposalSummary {
  id: string;
  quoteRequestId: string;
  requestCode: string;
  company: CustomerCompanySummary;
  status: QuoteStatus;
  latestProposalCode: string | null;
  latestVersionStatus: QuoteVersionStatus | null;
  finalTotalCents: number | null;
  validUntil: string | null;
  sentAt: string | null;
  updatedAt: string;
}

export interface CustomerAppointmentSummary {
  id: string;
  quoteRequestId: string;
  requestCode: string;
  company: CustomerCompanySummary;
  serviceName: string;
  status: AppointmentStatus;
  serviceStatus: ServiceStatus;
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number;
  timezone: string;
  address: string | null;
  updatedAt: string;
}

export interface CustomerPendingReviewSummary {
  appointmentId: string;
  quoteRequestId: string;
  requestCode: string;
  proposalCode: string | null;
  company: CustomerCompanySummary;
  serviceName: string;
  completedAt: string | null;
}

export interface CustomerNotificationSummary {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CustomerDashboardResponse {
  linkedRequestsCount: number;
  requests: CustomerQuoteRequestSummary[];
  proposals: CustomerProposalSummary[];
  appointments: CustomerAppointmentSummary[];
  history: CustomerQuoteRequestSummary[];
  favorites: CustomerCompanySummary[];
  recentCompanies: CustomerCompanySummary[];
  pendingReviews: CustomerPendingReviewSummary[];
  notifications: CustomerNotificationSummary[];
}

export interface CustomerProfileResponse {
  profile: CustomerProfileSummary;
}

export interface CustomerLinkVisitorRequestsResponse {
  linkedRequestsCount: number;
  dashboard: CustomerDashboardResponse;
}

export interface CustomerFavoriteResponse {
  favorite: CustomerCompanySummary;
  dashboard: CustomerDashboardResponse;
}

export interface CustomerRemoveFavoriteResponse {
  dashboard: CustomerDashboardResponse;
}
