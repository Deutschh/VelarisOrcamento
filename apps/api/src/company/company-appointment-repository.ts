import type {
  AppointmentStatus,
  CompanyAppointment,
  CompanyAppointmentConflict,
  ServiceStatus,
  SchedulingMode,
} from "@velaris/shared";

export type PersistedCompanyAppointment = CompanyAppointment;
export type PersistedCompanyAppointmentStatus = Exclude<AppointmentStatus, "none">;

export interface CreateCompanyAppointmentInput {
  id: string;
  quoteId: string;
  quoteVersionId: string;
  quoteRequestId: string;
  companyId: string;
  actorUserId: string;
  schedulingMode: SchedulingMode;
  proposalVersionStatus: CompanyAppointment["proposalVersionStatus"];
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  timezone: string;
  address: string | null;
  addressSnapshot: Record<string, unknown> | null;
  notes: string | null;
  conflictWarning: CompanyAppointmentConflict[];
  now: Date;
}

export interface UpdateCompanyAppointmentInput {
  appointmentId: string;
  companyId: string;
  actorUserId: string | null;
  actorType: "company" | "customer" | "system";
  eventType: string;
  fromStatus: PersistedCompanyAppointmentStatus;
  toStatus: PersistedCompanyAppointmentStatus;
  serviceStatus?: ServiceStatus;
  metadata: Record<string, unknown>;
  startsAt?: Date;
  endsAt?: Date;
  durationMinutes?: number;
  address?: string | null;
  addressSnapshot?: Record<string, unknown> | null;
  notes?: string | null;
  conflictWarning?: CompanyAppointmentConflict[];
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  now: Date;
}

export interface CompanyAppointmentRepository {
  findAppointmentByCompanyAndId(input: {
    companyId: string;
    appointmentId: string;
  }): Promise<PersistedCompanyAppointment | null>;
  findLatestAppointmentByQuote(input: {
    companyId: string;
    quoteId: string;
  }): Promise<PersistedCompanyAppointment | null>;
  findAppointmentsByQuoteRequest(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PersistedCompanyAppointment[]>;
  listPotentialConflicts(input: {
    companyId: string;
  }): Promise<CompanyAppointmentConflict[]>;
  createAppointment(
    input: CreateCompanyAppointmentInput,
  ): Promise<PersistedCompanyAppointment>;
  updateAppointment(
    input: UpdateCompanyAppointmentInput,
  ): Promise<PersistedCompanyAppointment>;
}
