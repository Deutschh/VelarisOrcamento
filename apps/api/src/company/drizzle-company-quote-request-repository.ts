import { randomUUID } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
  companyServices,
  quoteRequestAnswerRevisions,
  quoteRequestAnswers,
  quoteRequestCalculations,
  quoteRequestEvents,
  quoteRequestFiles,
  quoteRequests,
  templateServices,
} from "@velaris/database-schema";
import { quoteDraftDataSchema, type QuoteDraftFileSummary } from "@velaris/shared";
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
  templateService: typeof templateServices.$inferSelect;
};
type FileRow = typeof quoteRequestFiles.$inferSelect;

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
        templateService: templateServices,
      })
      .from(quoteRequests)
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
    const [fileRows, revisionRows, eventRows] = await Promise.all([
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
    ]);

    return {
      id: row.request.id,
      requestCode: row.request.requestCode,
      companyId: row.request.companyId,
      companyConfigurationId: row.request.companyConfigurationId,
      companyServiceId: row.request.companyServiceId,
      companyPricingVersionId: row.request.companyPricingVersionId,
      status: row.request.status,
      serviceName: row.templateService.name,
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
      calculationSnapshot: row.request.calculationSnapshot,
      internalTotalCents: decimalMoneyToCents(row.request.internalTotal),
      estimateMinCents: decimalMoneyToCents(row.request.estimateMin),
      estimateMaxCents: decimalMoneyToCents(row.request.estimateMax),
      submittedAt: row.request.submittedAt?.toISOString() ?? null,
      createdAt: row.request.createdAt.toISOString(),
      updatedAt: row.request.updatedAt.toISOString(),
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
