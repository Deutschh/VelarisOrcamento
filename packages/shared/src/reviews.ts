import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const serviceStatusSchema = z.enum([
  "not_started",
  "scheduled",
  "in_progress",
  "service_realized",
  "closed",
]);

export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const reviewStatusSchema = z.enum(["visible", "hidden"]);

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const publicReviewCreateRequestSchema = z.object({
  publicToken: z.string().trim().min(32).max(256),
  idempotencyKey: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.preprocess(emptyToUndefined, z.string().trim().min(3).max(1000).optional()),
});

export type PublicReviewCreateRequest = z.infer<typeof publicReviewCreateRequestSchema>;

export const adminReviewModerationRequestSchema = z
  .object({
    action: z.enum(["hide", "restore", "flag_suspicious", "clear_suspicious"]),
    reason: z.preprocess(emptyToUndefined, z.string().trim().min(3).max(800).optional()),
  })
  .superRefine((value, context) => {
    if (
      (value.action === "hide" || value.action === "flag_suspicious") &&
      !value.reason?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required for this moderation action.",
        path: ["reason"],
      });
    }
  });

export type AdminReviewModerationRequest = z.infer<
  typeof adminReviewModerationRequestSchema
>;

export interface PublicCompanyReview {
  id: string;
  companyId: string;
  quoteRequestId: string;
  appointmentId: string;
  requestCode: string;
  serviceName: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface PublicReviewCreateResponse {
  review: PublicCompanyReview;
}

export interface AdminReview extends PublicCompanyReview {
  quoteId: string;
  quoteVersionId: string;
  proposalCode: string;
  customerEmail: string | null;
  status: ReviewStatus;
  isSuspicious: boolean;
  moderationReason: string | null;
  moderatedByUserId: string | null;
  moderatedAt: string | null;
  updatedAt: string;
}

export interface AdminReviewsListResponse {
  reviews: AdminReview[];
}

export interface AdminReviewResponse {
  review: AdminReview;
}
