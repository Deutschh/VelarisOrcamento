import { randomUUID } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
  appointmentHistory,
  appointments,
  companyServices,
  companies,
  quotes,
  quoteRequestAnswerRevisions,
  quoteRequestAnswers,
  quoteRequestCalculations,
  quoteRequestEvents,
  quoteRequestFiles,
  quoteRequests,
  quoteVersions,
  templateServices,
} from "@velaris/database-schema";
import {
  quoteDraftDataSchema,
  type AppointmentStatus,
  type CompanyAppointment,
  type CompanyAppointmentConflict,
  type CompanyAppointmentHistory,
  type CompanyProposalSummary,
  type QuoteDraftFileSummary,
} from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import type {
  CompanyQuoteRequestRepository,
  PersistedCompanyQuoteRequest,
  SaveCompanyQuoteRequestReviewInput,
  TransitionCompanyQuoteRequestInput,
} from "./company-quote-request-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type RequestRow = {
  request: typeof quoteRequests.$inferSelect;
  company: typeof companies.$inferSelect;
  companyService: typeof companyServices.$inferSelect;
  templateService: typeof templateServices.$inferSelect;
};
type FileRow = typeof quoteRequestFiles.$inferSelect;
type ProposalRow = {
  quote: typeof quotes.$inferSelect;
  version: typeof quoteVersions.$inferSelect | null;
};
type AppointmentRow = {
  appointment: typeof appointments.$inferSelect;
  version: typeof quoteVersions.$inferSelect;
};

export class DrizzleCompanyQuoteRequestRepository implements CompanyQuoteRequestRepository {
  constructor(private readonly db: Database) {}

  async listQuoteRequests(input: {
    companyId: string;
  }): Promise<PersistedCompanyQuoteRequest[]> {
    const rows = await this.selectRequests(
      and(
        eq(quoteRequests.companyId, input.companyId),
        ne(quoteRequests.status, "draft"),
      ),
    );

    return Promise.all(rows.map((row) => this.mapRequest(row)));
  }

  async findQuoteRequestByCompanyAndId(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PersistedCompanyQuoteRequest | null> {
    const [row] = await this.selectRequests(
      and(
        eq(quoteRequests.id, input.quoteRequestId),
        eq(quoteRequests.companyId, input.companyId),
        ne(quoteRequests.status, "draft"),
      ),
    );

    return row ? this.mapRequest(row) : null;
  }

  async saveReview(
    input: SaveCompanyQuoteRequestReviewInput,
  ): Promise<PersistedCompanyQuoteRequest> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(quoteRequestAnswers)
        .where(eq(quoteRequestAnswers.quoteRequestId, input.quoteRequestId));

      if (input.answers.length > 0) {
        await tx.insert(quoteRequestAnswers).values(
          input.answers.map((answer) => ({
            id: answer.id,
            quoteRequestId: input.quoteRequestId,
            itemId: answer.itemId,
            fieldCode: answer.fieldCode,
            value: answer.value,
            originalValue: answer.originalValue,
            originalUnit: answer.originalUnit,
            normalizedValue: answer.normalizedValue,
            normalizedUnit: answer.normalizedUnit,
            metadata: answer.metadata,
            createdAt: input.now,
            updatedAt: input.now,
          })),
        );
      }

      if (input.revisions.length > 0) {
        await tx.insert(quoteRequestAnswerRevisions).values(
          input.revisions.map((revision) => ({
            id: revision.id,
            quoteRequestId: input.quoteRequestId,
            itemId: revision.itemId,
            fieldCode: revision.fieldCode,
            originalValue: revision.originalValue,
            revisedValue: revision.revisedValue,
            reason: revision.reason,
            impactAmount:
              revision.impactCents === null
                ? null
                : centsToDecimalMoney(revision.impactCents),
            configurationVersion: revision.configurationVersion,
            pricingVersion: revision.pricingVersion,
            actorUserId: revision.actorUserId,
            createdAt: input.now,
          })),
        );
      }

      await tx.insert(quoteRequestCalculations).values({
        id: cryptoRandomId(),
        quoteRequestId: input.quoteRequestId,
        calculationSnapshot: input.calculationSnapshot,
        internalTotal: centsToDecimalMoney(input.internalTotalCents),
        estimateMin: centsToDecimalMoney(input.estimateMinCents),
        estimateMax: centsToDecimalMoney(input.estimateMaxCents),
        createdAt: input.now,
      });

      const rows = await tx
        .update(quoteRequests)
        .set({
          requestData: input.data as unknown as Record<string, unknown>,
          calculationSnapshot: input.calculationSnapshot,
          internalTotal: centsToDecimalMoney(input.internalTotalCents),
          estimateMin: centsToDecimalMoney(input.estimateMinCents),
          estimateMax: centsToDecimalMoney(input.estimateMaxCents),
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteRequests.id, input.quoteRequestId),
            eq(quoteRequests.companyId, input.companyId),
            eq(quoteRequests.status, "under_review"),
          ),
        )
        .returning({ id: quoteRequests.id });

      if (rows.length === 0) {
        throw new Error("Quote request review could not be persisted.");
      }

      await insertEvent(tx, {
        quoteRequestId: input.quoteRequestId,
        actorUserId: input.actorUserId,
        eventType: "quote_request.review_saved",
        fromStatus: "under_review",
        toStatus: "under_review",
        metadata: input.eventMetadata,
        now: input.now,
      });
    });

    return this.findExisting(input.companyId, input.quoteRequestId);
  }

  async transitionStatus(
    input: TransitionCompanyQuoteRequestInput,
  ): Promise<PersistedCompanyQuoteRequest> {
    await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quoteRequests)
        .set({
          status: input.toStatus,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteRequests.id, input.quoteRequestId),
            eq(quoteRequests.companyId, input.companyId),
            eq(quoteRequests.status, input.fromStatus),
          ),
        )
        .returning({ id: quoteRequests.id });

      if (rows.length === 0) {
        throw new Error("Quote request status could not be transitioned.");
      }

      await insertEvent(tx, {
        quoteRequestId: input.quoteRequestId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        metadata: input.metadata,
        now: input.now,
      });
    });

    return this.findExisting(input.companyId, input.quoteRequestId);
  }

  private selectRequests(whereClause: SQL | undefined) {
    return this.db
      .select({
        request: quoteRequests,
        company: companies,
        companyService: companyServices,
        templateService: templateServices,
      })
      .from(quoteRequests)
      .innerJoin(companies, eq(companies.id, quoteRequests.companyId))
      .innerJoin(companyServices, eq(companyServices.id, quoteRequests.companyServiceId))
      .innerJoin(
        templateServices,
        eq(templateServices.id, companyServices.templateServiceId),
      )
      .where(whereClause)
      .orderBy(desc(quoteRequests.updatedAt));
  }

  private async findExisting(companyId: string, quoteRequestId: string) {
    const request = await this.findQuoteRequestByCompanyAndId({
      companyId,
      quoteRequestId,
    });

    if (!request) {
      throw new Error("Quote request not found after persistence.");
    }

    return request;
  }

  private async mapRequest(row: RequestRow): Promise<PersistedCompanyQuoteRequest> {
    const [fileRows, revisionRows, eventRows, proposalRows, appointmentRows] =
      await Promise.all([
        this.db
          .select()
          .from(quoteRequestFiles)
          .where(eq(quoteRequestFiles.quoteRequestId, row.request.id)),
        this.db
          .select()
          .from(quoteRequestAnswerRevisions)
          .where(eq(quoteRequestAnswerRevisions.quoteRequestId, row.request.id))
          .orderBy(desc(quoteRequestAnswerRevisions.createdAt)),
        this.db
          .select()
          .from(quoteRequestEvents)
          .where(eq(quoteRequestEvents.quoteRequestId, row.request.id))
          .orderBy(desc(quoteRequestEvents.createdAt)),
        this.db
          .select({
            quote: quotes,
            version: quoteVersions,
          })
          .from(quotes)
          .leftJoin(quoteVersions, eq(quoteVersions.quoteId, quotes.id))
          .where(eq(quotes.quoteRequestId, row.request.id))
          .orderBy(desc(quoteVersions.versionNumber)),
        this.db
          .select({
            appointment: appointments,
            version: quoteVersions,
          })
          .from(appointments)
          .innerJoin(quoteVersions, eq(quoteVersions.id, appointments.quoteVersionId))
          .where(eq(appointments.quoteRequestId, row.request.id))
          .orderBy(desc(appointments.updatedAt)),
      ]);

    return {
      id: row.request.id,
      requestCode: row.request.requestCode,
      companyId: row.request.companyId,
      companyTimezone: row.company.timezone,
      companyConfigurationId: row.request.companyConfigurationId,
      companyServiceId: row.request.companyServiceId,
      companyPricingVersionId: row.request.companyPricingVersionId,
      status: row.request.status,
      serviceName: row.templateService.name,
      serviceSchedulingMode: row.companyService.schedulingMode,
      serviceEstimatedDurationMinutes: row.companyService.estimatedDurationMinutes,
      data: quoteDraftDataSchema.parse(row.request.requestData),
      files: fileRows.map(mapFile),
      revisions: revisionRows.map((revision) => ({
        id: revision.id,
        itemId: revision.itemId,
        fieldCode: revision.fieldCode,
        originalValue: revision.originalValue,
        revisedValue: revision.revisedValue,
        reason: revision.reason,
        impactCents: decimalMoneyToCents(revision.impactAmount),
        configurationVersion: revision.configurationVersion,
        pricingVersion: revision.pricingVersion,
        actorUserId: revision.actorUserId,
        createdAt: revision.createdAt.toISOString(),
      })),
      events: eventRows.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        actorUserId: event.actorUserId,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      })),
      proposals: mapProposalSummaries(proposalRows),
      appointments: await Promise.all(
        appointmentRows.map((appointment) => this.mapAppointment(appointment)),
      ),
      calculationSnapshot: row.request.calculationSnapshot,
      internalTotalCents: decimalMoneyToCents(row.request.internalTotal),
      estimateMinCents: decimalMoneyToCents(row.request.estimateMin),
      estimateMaxCents: decimalMoneyToCents(row.request.estimateMax),
      submittedAt: row.request.submittedAt?.toISOString() ?? null,
      createdAt: row.request.createdAt.toISOString(),
      updatedAt: row.request.updatedAt.toISOString(),
    };
  }

  private async mapAppointment(row: AppointmentRow): Promise<CompanyAppointment> {
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
      history: historyRows.map((history): CompanyAppointmentHistory => ({
        id: history.id,
        appointmentId: history.appointmentId,
        actorUserId: history.actorUserId,
        actorType: history.actorType as CompanyAppointmentHistory["actorType"],
        eventType: history.eventType,
        fromStatus: history.fromStatus as AppointmentStatus | null,
        toStatus: history.toStatus as AppointmentStatus | null,
        metadata: history.metadata,
        createdAt: history.createdAt.toISOString(),
      })),
      createdAt: row.appointment.createdAt.toISOString(),
      updatedAt: row.appointment.updatedAt.toISOString(),
    };
  }
}

function mapFile(row: FileRow): QuoteDraftFileSummary {
  return {
    id: row.id,
    itemId: row.itemId,
    fieldCode: row.fieldCode,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageProvider: "stub",
    createdAt: row.createdAt.toISOString(),
  };
}

function mapProposalSummaries(rows: ProposalRow[]): CompanyProposalSummary[] {
  const grouped = new Map<
    string,
    {
      quote: typeof quotes.$inferSelect;
      versions: Array<typeof quoteVersions.$inferSelect>;
    }
  >();

  for (const row of rows) {
    const existing = grouped.get(row.quote.id);

    if (existing) {
      if (row.version) {
        existing.versions.push(row.version);
      }

      continue;
    }

    grouped.set(row.quote.id, {
      quote: row.quote,
      versions: row.version ? [row.version] : [],
    });
  }

  return Array.from(grouped.values()).map(({ quote, versions }) => {
    const latestVersion = versions
      .slice()
      .sort((left, right) => right.versionNumber - left.versionNumber)[0];

    return {
      id: quote.id,
      quoteRequestId: quote.quoteRequestId,
      companyId: quote.companyId,
      status: quote.status,
      latestVersionId: latestVersion?.id ?? null,
      latestVersionNumber: latestVersion?.versionNumber ?? null,
      latestProposalCode: latestVersion?.proposalCode ?? null,
      latestVersionStatus: latestVersion?.status ?? null,
      finalTotalCents: latestVersion
        ? decimalMoneyToCents(latestVersion.finalTotal)
        : null,
      validUntil: latestVersion?.validUntil.toISOString() ?? null,
      sentAt: latestVersion?.sentAt?.toISOString() ?? null,
      acceptedQuoteVersionId: quote.acceptedQuoteVersionId,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    };
  });
}

async function insertEvent(
  tx: Transaction,
  input: {
    quoteRequestId: string;
    actorUserId: string;
    eventType: string;
    fromStatus: TransitionCompanyQuoteRequestInput["fromStatus"];
    toStatus: TransitionCompanyQuoteRequestInput["toStatus"];
    metadata: Record<string, unknown>;
    now: Date;
  },
) {
  await tx.insert(quoteRequestEvents).values({
    id: cryptoRandomId(),
    quoteRequestId: input.quoteRequestId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    metadata: input.metadata,
    createdAt: input.now,
  });
}

function decimalMoneyToCents(value: string | null) {
  if (value === null) {
    return null;
  }

  const [whole = "0", decimals = ""] = value.split(".");
  return Number(`${whole}${decimals.padEnd(2, "0").slice(0, 2)}`);
}

function centsToDecimalMoney(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const whole = Math.floor(absoluteValue / 100);
  const cents = String(absoluteValue % 100).padStart(2, "0");

  return `${sign}${whole}.${cents}`;
}

function cryptoRandomId() {
  return randomUUID();
}
