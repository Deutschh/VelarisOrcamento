import { z } from "zod";
import type { QuoteVersionStatus } from "./proposals.js";
import type { ServiceStatus } from "./reviews.js";
import type { SchedulingMode } from "./templates.js";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const appointmentStatusSchema = z.enum([
  "none",
  "proposed",
  "confirmed",
  "reschedule_requested",
  "rescheduled",
  "completed",
  "cancelled",
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const companyProposeAppointmentRequestSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.coerce.number().int().min(15).max(1440).optional(),
  address: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(500).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
});

export type CompanyProposeAppointmentRequest = z.infer<
  typeof companyProposeAppointmentRequestSchema
>;

export const companyUpdateAppointmentRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("propose_new_time"),
    startsAt: z.string().datetime({ offset: true }),
    durationMinutes: z.coerce.number().int().min(15).max(1440).optional(),
    address: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(500).optional()),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.preprocess(emptyToUndefined, z.string().trim().max(800).optional()),
  }),
]);

export type CompanyUpdateAppointmentRequest = z.infer<
  typeof companyUpdateAppointmentRequestSchema
>;

export const customerAppointmentActionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm"),
  }),
  z.object({
    action: z.literal("request_reschedule"),
    reason: z.preprocess(emptyToUndefined, z.string().trim().max(800).optional()),
  }),
]);

export type CustomerAppointmentActionRequest = z.infer<
  typeof customerAppointmentActionRequestSchema
>;

export interface CompanyAppointmentConflict {
  appointmentId: string;
  quoteRequestId: string;
  proposalCode: string | null;
  status: Exclude<AppointmentStatus, "none">;
  startsAt: string;
  endsAt: string | null;
}

export interface CompanyAppointmentHistory {
  id: string;
  appointmentId: string;
  actorUserId: string | null;
  actorType: "company" | "customer" | "system";
  eventType: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CompanyAppointment {
  id: string;
  quoteId: string;
  quoteVersionId: string;
  quoteRequestId: string;
  companyId: string;
  status: Exclude<AppointmentStatus, "none">;
  serviceStatus: ServiceStatus;
  schedulingMode: SchedulingMode;
  proposalVersionStatus: QuoteVersionStatus;
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number;
  timezone: string;
  address: string | null;
  addressSnapshot: Record<string, unknown> | null;
  notes: string | null;
  conflictWarning: CompanyAppointmentConflict[];
  proposedByUserId: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  history: CompanyAppointmentHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyAppointmentResponse {
  appointment: CompanyAppointment;
  conflictWarning: CompanyAppointmentConflict[];
}
