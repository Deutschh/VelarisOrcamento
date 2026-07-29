import { and, eq, lt } from "drizzle-orm";

import {
  idempotencyKeys,
  publicAccessTokens,
  quoteRequestAnswers,
  quoteRequestCalculations,
  quoteRequestFiles,
  quoteRequests,
} from "@velaris/database-schema";
import { quoteDraftDataSchema, type QuoteDraftFileSummary } from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import type {
  AddDraftFileInput,
  CreateDraftRecordInput,
  IdempotencyRecord,
  PersistedQuoteRequest,
  PublicQuoteRequestRepository,
  QuoteRequestAnswerInput,
  SaveCalculationInput,
  SubmitDraftInput,
  UpdateDraftRecordInput,
} from "./quote-request-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type QuoteRequestRow = typeof quoteRequests.$inferSelect;
type QuoteRequestFileRow = typeof quoteRequestFiles.$inferSelect;

export class DrizzleQuoteRequestRepository implements PublicQuoteRequestRepository {
  constructor(private readonly db: Database) {}

  async createDraft(input: CreateDraftRecordInput): Promise<PersistedQuoteRequest> {
    await this.db.transaction(async (tx) => {
      await tx.insert(quoteRequests).values({
        id: input.id,
        companyId: input.companyId,
        companyConfigurationId: input.companyConfigurationId,
        companyServiceId: input.companyServiceId,
        companyPricingVersionId: input.companyPricingVersionId,
        status: "draft",
        draftTokenHash: input.draftTokenHash,
        requestData: input.data as unknown as Record<string, unknown>,
        expiresAt: input.expiresAt,
        createdAt: input.now,
        updatedAt: input.now,
      });
      await replaceAnswers(tx, input.id, input.answers, input.now);
    });

    return this.findByIdOrThrow(input.id);
  }

  async findByDraftTokenHash(
    draftTokenHash: string,
  ): Promise<PersistedQuoteRequest | null> {
    const [row] = await this.db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.draftTokenHash, draftTokenHash))
      .limit(1);

    return row ? this.mapQuoteRequest(row) : null;
  }

  async updateDraft(input: UpdateDraftRecordInput): Promise<PersistedQuoteRequest> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(quoteRequests)
        .set({
          requestData: input.data as unknown as Record<string, unknown>,
          updatedAt: input.now,
        })
        .where(eq(quoteRequests.id, input.quoteRequestId));
      await replaceAnswers(tx, input.quoteRequestId, input.answers, input.now);
    });

    return this.findByIdOrThrow(input.quoteRequestId);
  }

  async addDraftFile(input: AddDraftFileInput): Promise<QuoteDraftFileSummary> {
    const [row] = await this.db
      .insert(quoteRequestFiles)
      .values({
        id: input.id,
        quoteRequestId: input.quoteRequestId,
        itemId: input.itemId,
        fieldCode: input.fieldCode,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageProvider: "stub",
        status: "metadata_received",
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to persist quote request file metadata.");
    }

    return mapFile(row);
  }

  async deleteDraftFile(input: {
    quoteRequestId: string;
    fileId: string;
  }): Promise<boolean> {
    const rows = await this.db
      .delete(quoteRequestFiles)
      .where(
        and(
          eq(quoteRequestFiles.id, input.fileId),
          eq(quoteRequestFiles.quoteRequestId, input.quoteRequestId),
        ),
      )
      .returning({ id: quoteRequestFiles.id });

    return rows.length > 0;
  }

  async saveCalculation(input: SaveCalculationInput): Promise<PersistedQuoteRequest> {
    await this.db.transaction(async (tx) => {
      await insertCalculation(tx, input);
      await tx
        .update(quoteRequests)
        .set({
          calculationSnapshot: input.calculationSnapshot,
          internalTotal: centsToDecimalMoney(input.internalTotalCents),
          estimateMin: centsToDecimalMoney(input.estimateMinCents),
          estimateMax: centsToDecimalMoney(input.estimateMaxCents),
          updatedAt: input.now,
        })
        .where(eq(quoteRequests.id, input.quoteRequestId));
    });

    return this.findByIdOrThrow(input.quoteRequestId);
  }

  async findIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<IdempotencyRecord | null> {
    const [row] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(
        and(eq(idempotencyKeys.scope, input.scope), eq(idempotencyKeys.key, input.key)),
      )
      .limit(1);

    return row
      ? {
          id: row.id,
          scope: row.scope,
          key: row.key,
          requestHash: row.requestHash,
          responseBody: row.responseBody as unknown as IdempotencyRecord["responseBody"],
          statusCode: row.statusCode,
          expiresAt: row.expiresAt.toISOString(),
        }
      : null;
  }

  async submitDraft(input: SubmitDraftInput): Promise<PersistedQuoteRequest> {
    await this.db.transaction(async (tx) => {
      await tx.insert(publicAccessTokens).values({
        id: input.publicTokenId,
        tokenHash: input.publicTokenHash,
        entityType: "quote_request",
        entityId: input.quoteRequestId,
        expiresAt: input.publicTokenExpiresAt,
        metadata: {
          requestCode: input.requestCode,
        },
        createdAt: input.now,
        updatedAt: input.now,
      });
      await insertCalculation(tx, input);

      const rows = await tx
        .update(quoteRequests)
        .set({
          requestCode: input.requestCode,
          status: "submitted",
          publicTokenId: input.publicTokenId,
          configurationSnapshot: input.configurationSnapshot,
          legalSnapshot: input.legalSnapshot,
          calculationSnapshot: input.calculationSnapshot,
          internalTotal: centsToDecimalMoney(input.internalTotalCents),
          estimateMin: centsToDecimalMoney(input.estimateMinCents),
          estimateMax: centsToDecimalMoney(input.estimateMaxCents),
          submittedAt: input.submittedAt,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteRequests.id, input.quoteRequestId),
            eq(quoteRequests.status, "draft"),
          ),
        )
        .returning({ id: quoteRequests.id });

      if (rows.length === 0) {
        throw new Error("Quote request draft could not be submitted.");
      }

      await tx.insert(idempotencyKeys).values({
        id: input.idempotency.id,
        scope: input.idempotency.scope,
        key: input.idempotency.key,
        requestHash: input.idempotency.requestHash,
        responseBody: input.idempotency.responseBody as unknown as Record<
          string,
          unknown
        >,
        statusCode: input.idempotency.statusCode,
        expiresAt: input.idempotency.expiresAt,
        createdAt: input.now,
      });
    });

    return this.findByIdOrThrow(input.quoteRequestId);
  }

  async deleteExpiredDrafts(now: Date): Promise<number> {
    const rows = await this.db
      .delete(quoteRequests)
      .where(and(eq(quoteRequests.status, "draft"), lt(quoteRequests.expiresAt, now)))
      .returning({ id: quoteRequests.id });

    return rows.length;
  }

  private async findByIdOrThrow(quoteRequestId: string) {
    const [row] = await this.db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.id, quoteRequestId))
      .limit(1);

    if (!row) {
      throw new Error("Quote request not found after persistence.");
    }

    return this.mapQuoteRequest(row);
  }

  private async mapQuoteRequest(row: QuoteRequestRow): Promise<PersistedQuoteRequest> {
    const fileRows = await this.db
      .select()
      .from(quoteRequestFiles)
      .where(eq(quoteRequestFiles.quoteRequestId, row.id));

    return {
      id: row.id,
      requestCode: row.requestCode,
      companyId: row.companyId,
      companyConfigurationId: row.companyConfigurationId,
      companyServiceId: row.companyServiceId,
      companyPricingVersionId: row.companyPricingVersionId,
      customerId: row.customerId,
      status: row.status,
      draftTokenHash: row.draftTokenHash,
      publicTokenId: row.publicTokenId,
      data: quoteDraftDataSchema.parse(row.requestData),
      configurationSnapshot: row.configurationSnapshot,
      legalSnapshot: row.legalSnapshot,
      calculationSnapshot: row.calculationSnapshot,
      internalTotalCents: decimalMoneyToCents(row.internalTotal),
      estimateMinCents: decimalMoneyToCents(row.estimateMin),
      estimateMaxCents: decimalMoneyToCents(row.estimateMax),
      submittedAt: row.submittedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      files: fileRows.map(mapFile),
    };
  }
}

async function replaceAnswers(
  tx: Transaction,
  quoteRequestId: string,
  answers: QuoteRequestAnswerInput[],
  now: Date,
) {
  await tx
    .delete(quoteRequestAnswers)
    .where(eq(quoteRequestAnswers.quoteRequestId, quoteRequestId));

  if (answers.length === 0) {
    return;
  }

  await tx.insert(quoteRequestAnswers).values(
    answers.map((answer) => ({
      id: answer.id,
      quoteRequestId,
      itemId: answer.itemId,
      fieldCode: answer.fieldCode,
      value: answer.value,
      originalValue: answer.originalValue,
      originalUnit: answer.originalUnit,
      normalizedValue: answer.normalizedValue,
      normalizedUnit: answer.normalizedUnit,
      metadata: answer.metadata,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

async function insertCalculation(tx: Transaction, input: SaveCalculationInput) {
  await tx.insert(quoteRequestCalculations).values({
    id: input.id,
    quoteRequestId: input.quoteRequestId,
    calculationSnapshot: input.calculationSnapshot,
    internalTotal: centsToDecimalMoney(input.internalTotalCents),
    estimateMin: centsToDecimalMoney(input.estimateMinCents),
    estimateMax: centsToDecimalMoney(input.estimateMaxCents),
    createdAt: input.now,
  });
}

function mapFile(row: QuoteRequestFileRow): QuoteDraftFileSummary {
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
