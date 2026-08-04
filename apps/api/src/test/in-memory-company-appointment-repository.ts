import { randomUUID } from "node:crypto";
import type {
  CompanyAppointment,
  CompanyAppointmentConflict,
  CompanyAppointmentHistory,
} from "@velaris/shared";
import type {
  CompanyAppointmentRepository,
  CreateCompanyAppointmentInput,
  UpdateCompanyAppointmentInput,
} from "../company/company-appointment-repository.js";

export class InMemoryCompanyAppointmentRepository implements CompanyAppointmentRepository {
  readonly appointments = new Map<string, CompanyAppointment>();

  async findAppointmentByCompanyAndId(input: {
    companyId: string;
    appointmentId: string;
  }): Promise<CompanyAppointment | null> {
    const appointment = this.appointments.get(input.appointmentId);

    return appointment?.companyId === input.companyId ? appointment : null;
  }

  async findLatestAppointmentByQuote(input: {
    companyId: string;
    quoteId: string;
  }): Promise<CompanyAppointment | null> {
    return (
      Array.from(this.appointments.values())
        .filter(
          (appointment) =>
            appointment.companyId === input.companyId &&
            appointment.quoteId === input.quoteId,
        )
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )[0] ?? null
    );
  }

  async findAppointmentsByQuoteRequest(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyAppointment[]> {
    return Array.from(this.appointments.values())
      .filter(
        (appointment) =>
          appointment.companyId === input.companyId &&
          appointment.quoteRequestId === input.quoteRequestId,
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }

  async listPotentialConflicts(input: {
    companyId: string;
  }): Promise<CompanyAppointmentConflict[]> {
    return Array.from(this.appointments.values())
      .filter(
        (appointment) =>
          appointment.companyId === input.companyId &&
          ["proposed", "rescheduled", "confirmed"].includes(appointment.status),
      )
      .map((appointment) => ({
        appointmentId: appointment.id,
        quoteRequestId: appointment.quoteRequestId,
        proposalCode: "ORC-TESTE-V1",
        status: appointment.status,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
      }));
  }

  async createAppointment(
    input: CreateCompanyAppointmentInput,
  ): Promise<CompanyAppointment> {
    const appointment: CompanyAppointment = {
      id: input.id,
      quoteId: input.quoteId,
      quoteVersionId: input.quoteVersionId,
      quoteRequestId: input.quoteRequestId,
      companyId: input.companyId,
      status: "proposed",
      serviceStatus: "not_started",
      schedulingMode: input.schedulingMode,
      proposalVersionStatus: input.proposalVersionStatus,
      startsAt: input.startsAt.toISOString(),
      endsAt: input.endsAt.toISOString(),
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      address: input.address,
      addressSnapshot: input.addressSnapshot,
      notes: input.notes,
      conflictWarning: input.conflictWarning,
      proposedByUserId: input.actorUserId,
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      history: [
        historyEvent({
          appointmentId: input.id,
          actorUserId: input.actorUserId,
          actorType: "company",
          eventType: "appointment.proposed",
          fromStatus: "none",
          toStatus: "proposed",
          metadata: {},
          now: input.now,
        }),
      ],
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };

    this.appointments.set(input.id, appointment);
    return appointment;
  }

  async updateAppointment(
    input: UpdateCompanyAppointmentInput,
  ): Promise<CompanyAppointment> {
    const current = this.appointments.get(input.appointmentId);

    if (
      !current ||
      current.companyId !== input.companyId ||
      current.status !== input.fromStatus
    ) {
      throw new Error("Appointment could not be updated.");
    }

    const next: CompanyAppointment = {
      ...current,
      status: input.toStatus,
      serviceStatus: input.serviceStatus ?? current.serviceStatus,
      startsAt: input.startsAt?.toISOString() ?? current.startsAt,
      endsAt: input.endsAt?.toISOString() ?? current.endsAt,
      durationMinutes: input.durationMinutes ?? current.durationMinutes,
      address: input.address === undefined ? current.address : input.address,
      addressSnapshot:
        input.addressSnapshot === undefined
          ? current.addressSnapshot
          : input.addressSnapshot,
      notes: input.notes === undefined ? current.notes : input.notes,
      conflictWarning: input.conflictWarning ?? current.conflictWarning,
      confirmedAt:
        input.confirmedAt === undefined
          ? current.confirmedAt
          : (input.confirmedAt?.toISOString() ?? null),
      completedAt:
        input.completedAt === undefined
          ? current.completedAt
          : (input.completedAt?.toISOString() ?? null),
      cancelledAt:
        input.cancelledAt === undefined
          ? current.cancelledAt
          : (input.cancelledAt?.toISOString() ?? null),
      history: [
        historyEvent({
          appointmentId: input.appointmentId,
          actorUserId: input.actorUserId,
          actorType: input.actorType,
          eventType: input.eventType,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          metadata: input.metadata,
          now: input.now,
        }),
        ...current.history,
      ],
      updatedAt: input.now.toISOString(),
    };

    this.appointments.set(next.id, next);
    return next;
  }
}

function historyEvent(input: {
  appointmentId: string;
  actorUserId: string | null;
  actorType: CompanyAppointmentHistory["actorType"];
  eventType: string;
  fromStatus: CompanyAppointmentHistory["fromStatus"];
  toStatus: CompanyAppointmentHistory["toStatus"];
  metadata: Record<string, unknown>;
  now: Date;
}): CompanyAppointmentHistory {
  return {
    id: randomUUID(),
    appointmentId: input.appointmentId,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    metadata: input.metadata,
    createdAt: input.now.toISOString(),
  };
}
