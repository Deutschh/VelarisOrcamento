import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  appointmentHistory,
  appointments,
  quoteVersions,
} from "@velaris/database-schema";
import type {
  AppointmentStatus,
  CompanyAppointment,
  CompanyAppointmentConflict,
  CompanyAppointmentHistory,
} from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import type {
  CompanyAppointmentRepository,
  CreateCompanyAppointmentInput,
  UpdateCompanyAppointmentInput,
} from "./company-appointment-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type AppointmentRow = typeof appointments.$inferSelect;
type AppointmentHistoryRow = typeof appointmentHistory.$inferSelect;
type QuoteVersionRow = typeof quoteVersions.$inferSelect;
type AppointmentJoinRow = {
  appointment: AppointmentRow;
  version: QuoteVersionRow;
};

export class DrizzleCompanyAppointmentRepository implements CompanyAppointmentRepository {
  constructor(private readonly db: Database) {}

  async findAppointmentByCompanyAndId(input: {
    companyId: string;
    appointmentId: string;
  }): Promise<CompanyAppointment | null> {
    const [row] = await this.selectAppointments(
      and(
        eq(appointments.companyId, input.companyId),
        eq(appointments.id, input.appointmentId),
      ),
    );

    return row ? this.mapAppointment(row) : null;
  }

  async findLatestAppointmentByQuote(input: {
    companyId: string;
    quoteId: string;
  }): Promise<CompanyAppointment | null> {
    const [row] = await this.selectAppointments(
      and(
        eq(appointments.companyId, input.companyId),
        eq(appointments.quoteId, input.quoteId),
      ),
    );

    return row ? this.mapAppointment(row) : null;
  }

  async findAppointmentsByQuoteRequest(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyAppointment[]> {
    const rows = await this.selectAppointments(
      and(
        eq(appointments.companyId, input.companyId),
        eq(appointments.quoteRequestId, input.quoteRequestId),
      ),
    );

    return Promise.all(rows.map((row) => this.mapAppointment(row)));
  }

  async listPotentialConflicts(input: {
    companyId: string;
  }): Promise<CompanyAppointmentConflict[]> {
    const rows = await this.db
      .select({
        appointment: appointments,
        version: quoteVersions,
      })
      .from(appointments)
      .innerJoin(quoteVersions, eq(quoteVersions.id, appointments.quoteVersionId))
      .where(
        and(
          eq(appointments.companyId, input.companyId),
          inArray(appointments.status, ["proposed", "rescheduled", "confirmed"]),
        ),
      )
      .orderBy(desc(appointments.startsAt));

    return rows.map(({ appointment, version }) => ({
      appointmentId: appointment.id,
      quoteRequestId: appointment.quoteRequestId,
      proposalCode: version.proposalCode,
      status: appointment.status as CompanyAppointmentConflict["status"],
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt?.toISOString() ?? null,
    }));
  }

  async createAppointment(
    input: CreateCompanyAppointmentInput,
  ): Promise<CompanyAppointment> {
    await this.db.transaction(async (tx) => {
      await tx.insert(appointments).values({
        id: input.id,
        quoteId: input.quoteId,
        quoteVersionId: input.quoteVersionId,
        quoteRequestId: input.quoteRequestId,
        companyId: input.companyId,
        status: "proposed",
        serviceStatus: "not_started",
        schedulingMode: input.schedulingMode,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        durationMinutes: input.durationMinutes,
        timezone: input.timezone,
        address: input.address,
        addressSnapshot: input.addressSnapshot,
        notes: input.notes,
        conflictWarning: input.conflictWarning as unknown as Array<
          Record<string, unknown>
        >,
        proposedByUserId: input.actorUserId,
        createdAt: input.now,
        updatedAt: input.now,
      });

      await insertHistory(tx, {
        appointmentId: input.id,
        actorUserId: input.actorUserId,
        actorType: "company",
        eventType: "appointment.proposed",
        fromStatus: "none",
        toStatus: "proposed",
        metadata: {
          quoteId: input.quoteId,
          quoteVersionId: input.quoteVersionId,
          startsAt: input.startsAt.toISOString(),
          endsAt: input.endsAt.toISOString(),
          durationMinutes: input.durationMinutes,
          conflictCount: input.conflictWarning.length,
        },
        now: input.now,
      });
    });

    return this.findExisting(input.companyId, input.id);
  }

  async updateAppointment(
    input: UpdateCompanyAppointmentInput,
  ): Promise<CompanyAppointment> {
    await this.db.transaction(async (tx) => {
      const changes: Partial<typeof appointments.$inferInsert> = {
        status: input.toStatus,
        updatedAt: input.now,
      };

      if (input.startsAt !== undefined) {
        changes.startsAt = input.startsAt;
      }

      if (input.endsAt !== undefined) {
        changes.endsAt = input.endsAt;
      }

      if (input.durationMinutes !== undefined) {
        changes.durationMinutes = input.durationMinutes;
      }

      if (input.address !== undefined) {
        changes.address = input.address;
      }

      if (input.addressSnapshot !== undefined) {
        changes.addressSnapshot = input.addressSnapshot;
      }

      if (input.notes !== undefined) {
        changes.notes = input.notes;
      }

      if (input.conflictWarning !== undefined) {
        changes.conflictWarning = input.conflictWarning as unknown as Array<
          Record<string, unknown>
        >;
      }

      if (input.confirmedAt !== undefined) {
        changes.confirmedAt = input.confirmedAt;
      }

      if (input.completedAt !== undefined) {
        changes.completedAt = input.completedAt;
      }

      if (input.cancelledAt !== undefined) {
        changes.cancelledAt = input.cancelledAt;
      }

      if (input.serviceStatus !== undefined) {
        changes.serviceStatus = input.serviceStatus;
      }

      const rows = await tx
        .update(appointments)
        .set(changes)
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.companyId, input.companyId),
            eq(appointments.status, input.fromStatus),
          ),
        )
        .returning({ id: appointments.id });

      if (rows.length === 0) {
        throw new Error("Appointment could not be updated.");
      }

      await insertHistory(tx, {
        appointmentId: input.appointmentId,
        actorUserId: input.actorUserId,
        actorType: input.actorType,
        eventType: input.eventType,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        metadata: input.metadata,
        now: input.now,
      });
    });

    return this.findExisting(input.companyId, input.appointmentId);
  }

  private selectAppointments(whereClause: SQL | undefined) {
    return this.db
      .select({
        appointment: appointments,
        version: quoteVersions,
      })
      .from(appointments)
      .innerJoin(quoteVersions, eq(quoteVersions.id, appointments.quoteVersionId))
      .where(whereClause)
      .orderBy(desc(appointments.updatedAt));
  }

  private async mapAppointment(row: AppointmentJoinRow): Promise<CompanyAppointment> {
    const historyRows = await this.db
      .select()
      .from(appointmentHistory)
      .where(eq(appointmentHistory.appointmentId, row.appointment.id))
      .orderBy(desc(appointmentHistory.createdAt));

    return {
      id: row.appointment.id,
      quoteId: row.appointment.quoteId,
      quoteVersionId: row.appointment.quoteVersionId,
      quoteRequestId: row.appointment.quoteRequestId,
      companyId: row.appointment.companyId,
      status: row.appointment.status as CompanyAppointment["status"],
      serviceStatus: row.appointment.serviceStatus,
      schedulingMode: row.appointment.schedulingMode,
      proposalVersionStatus: row.version.status,
      startsAt: row.appointment.startsAt.toISOString(),
      endsAt: row.appointment.endsAt?.toISOString() ?? null,
      durationMinutes: row.appointment.durationMinutes,
      timezone: row.appointment.timezone,
      address: row.appointment.address,
      addressSnapshot: row.appointment.addressSnapshot,
      notes: row.appointment.notes,
      conflictWarning: row.appointment
        .conflictWarning as unknown as CompanyAppointmentConflict[],
      proposedByUserId: row.appointment.proposedByUserId,
      confirmedAt: row.appointment.confirmedAt?.toISOString() ?? null,
      completedAt: row.appointment.completedAt?.toISOString() ?? null,
      cancelledAt: row.appointment.cancelledAt?.toISOString() ?? null,
      history: historyRows.map(mapHistory),
      createdAt: row.appointment.createdAt.toISOString(),
      updatedAt: row.appointment.updatedAt.toISOString(),
    };
  }

  private async findExisting(companyId: string, appointmentId: string) {
    const appointment = await this.findAppointmentByCompanyAndId({
      companyId,
      appointmentId,
    });

    if (!appointment) {
      throw new Error("Appointment not found after persistence.");
    }

    return appointment;
  }
}

function mapHistory(row: AppointmentHistoryRow): CompanyAppointmentHistory {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    actorUserId: row.actorUserId,
    actorType: row.actorType as CompanyAppointmentHistory["actorType"],
    eventType: row.eventType,
    fromStatus: row.fromStatus as AppointmentStatus | null,
    toStatus: row.toStatus as AppointmentStatus | null,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

async function insertHistory(
  tx: Transaction,
  input: {
    appointmentId: string;
    actorUserId: string | null;
    actorType: CompanyAppointmentHistory["actorType"];
    eventType: string;
    fromStatus: AppointmentStatus | null;
    toStatus: AppointmentStatus | null;
    metadata: Record<string, unknown>;
    now: Date;
  },
) {
  await tx.insert(appointmentHistory).values({
    id: randomUUID(),
    appointmentId: input.appointmentId,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    metadata: input.metadata,
    createdAt: input.now,
  });
}
