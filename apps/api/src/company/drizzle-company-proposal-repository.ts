import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import {
  idempotencyKeys,
  quotes,
  quoteVersionEvents,
  quoteVersionItems,
  quoteVersions,
} from "@velaris/database-schema";
import type { CompanyProposalDetail, CompanyProposalVersion } from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import type {
  CompanyProposalRepository,
  CreateProposalVersionInput,
  ProposalSendIdempotencyRecord,
  SendProposalVersionInput,
} from "./company-proposal-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type QuoteRow = typeof quotes.$inferSelect;
type QuoteVersionRow = typeof quoteVersions.$inferSelect;
type QuoteVersionItemRow = typeof quoteVersionItems.$inferSelect;
type QuoteVersionEventRow = typeof quoteVersionEvents.$inferSelect;

export class DrizzleCompanyProposalRepository implements CompanyProposalRepository {
  constructor(private readonly db: Database) {}

  async findProposalByQuoteRequest(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyProposalDetail | null> {
    const [quote] = await this.db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.companyId, input.companyId),
          eq(quotes.quoteRequestId, input.quoteRequestId),
        ),
      )
      .limit(1);

    return quote ? this.mapProposal(quote) : null;
  }

  async findProposalByCompanyAndId(input: {
    companyId: string;
    quoteId: string;
  }): Promise<CompanyProposalDetail | null> {
    const [quote] = await this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.companyId, input.companyId), eq(quotes.id, input.quoteId)))
      .limit(1);

    return quote ? this.mapProposal(quote) : null;
  }

  async createVersion(input: CreateProposalVersionInput): Promise<CompanyProposalDetail> {
    await this.db.transaction(async (tx) => {
      if (!input.hasExistingQuote) {
        await tx.insert(quotes).values({
          id: input.quoteId,
          quoteRequestId: input.quoteRequestId,
          companyId: input.companyId,
          status: "draft",
          createdAt: input.now,
          updatedAt: input.now,
        });
      } else {
        await tx
          .update(quotes)
          .set({
            status: "draft",
            updatedAt: input.now,
          })
          .where(
            and(eq(quotes.id, input.quoteId), eq(quotes.companyId, input.companyId)),
          );

        await tx
          .update(quoteVersions)
          .set({
            status: "superseded",
            updatedAt: input.now,
          })
          .where(
            and(
              eq(quoteVersions.quoteId, input.quoteId),
              eq(quoteVersions.status, "draft"),
            ),
          );
      }

      await tx.insert(quoteVersions).values({
        id: input.versionId,
        quoteId: input.quoteId,
        quoteRequestId: input.quoteRequestId,
        companyId: input.companyId,
        versionNumber: input.versionNumber,
        proposalCode: input.proposalCode,
        status: "draft",
        internalTotal: centsToDecimalMoney(input.internalTotalCents),
        estimateMin: centsToDecimalMoney(input.estimateMinCents),
        estimateMax: centsToDecimalMoney(input.estimateMaxCents),
        finalTotal: centsToDecimalMoney(input.finalTotalCents),
        outOfRangeReason: input.outOfRangeReason,
        validUntil: input.validUntil,
        terms: input.terms,
        termsVersion: input.termsVersion,
        snapshot: input.snapshot,
        createdByUserId: input.actorUserId,
        createdAt: input.now,
        updatedAt: input.now,
      });

      if (input.items.length > 0) {
        await tx.insert(quoteVersionItems).values(
          input.items.map((item) => ({
            id: item.id,
            quoteVersionId: input.versionId,
            itemId: item.itemId,
            label: item.label,
            quantity: item.quantity,
            internalTotal: centsToDecimalMoney(item.internalTotalCents),
            finalTotal: centsToDecimalMoney(item.finalTotalCents),
            snapshot: item.snapshot,
            displayOrder: item.displayOrder,
            createdAt: input.now,
            updatedAt: input.now,
          })),
        );
      }

      await insertVersionEvent(tx, {
        quoteVersionId: input.versionId,
        actorUserId: input.actorUserId,
        eventType: "proposal.version_created",
        fromStatus: null,
        toStatus: "draft",
        metadata: {
          quoteRequestId: input.quoteRequestId,
          proposalCode: input.proposalCode,
          versionNumber: input.versionNumber,
          finalTotalCents: input.finalTotalCents,
          outOfRangeReason: input.outOfRangeReason,
        },
        now: input.now,
      });
    });

    return this.findExisting(input.companyId, input.quoteId);
  }

  async findSendIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ProposalSendIdempotencyRecord | null> {
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
          responseBody:
            row.responseBody as unknown as ProposalSendIdempotencyRecord["responseBody"],
          statusCode: row.statusCode,
          expiresAt: row.expiresAt.toISOString(),
        }
      : null;
  }

  async sendVersion(input: SendProposalVersionInput): Promise<CompanyProposalDetail> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(quoteVersions)
        .set({
          status: "superseded",
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteVersions.quoteId, input.quoteId),
            ne(quoteVersions.id, input.quoteVersionId),
            ne(quoteVersions.status, "accepted"),
          ),
        );

      const versionRows = await tx
        .update(quoteVersions)
        .set({
          status: input.toStatus,
          sentByUserId: input.actorUserId,
          sentAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteVersions.id, input.quoteVersionId),
            eq(quoteVersions.quoteId, input.quoteId),
            eq(quoteVersions.companyId, input.companyId),
            eq(quoteVersions.status, input.fromStatus),
          ),
        )
        .returning({ id: quoteVersions.id });

      if (versionRows.length === 0) {
        throw new Error("Proposal version could not be sent.");
      }

      await tx
        .update(quotes)
        .set({
          status: input.quoteStatus,
          updatedAt: input.now,
        })
        .where(and(eq(quotes.id, input.quoteId), eq(quotes.companyId, input.companyId)));

      await insertVersionEvent(tx, {
        quoteVersionId: input.quoteVersionId,
        actorUserId: input.actorUserId,
        eventType: "proposal.sent",
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        metadata: {
          quoteId: input.quoteId,
        },
        now: input.now,
      });

      await tx.insert(idempotencyKeys).values({
        id: input.idempotency.id,
        scope: input.idempotency.scope,
        key: input.idempotency.key,
        requestHash: input.idempotency.requestHash,
        responseBody: input.idempotency.responseBody,
        statusCode: input.idempotency.statusCode,
        expiresAt: input.idempotency.expiresAt,
        createdAt: input.now,
      });
    });

    return this.findExisting(input.companyId, input.quoteId);
  }

  private async findExisting(companyId: string, quoteId: string) {
    const proposal = await this.findProposalByCompanyAndId({
      companyId,
      quoteId,
    });

    if (!proposal) {
      throw new Error("Proposal not found after persistence.");
    }

    return proposal;
  }

  private async mapProposal(quote: QuoteRow): Promise<CompanyProposalDetail> {
    const versionRows = await this.db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quote.id))
      .orderBy(desc(quoteVersions.versionNumber));
    const versionIds = versionRows.map((version) => version.id);
    const [itemRows, eventRows] =
      versionIds.length > 0
        ? await Promise.all([
            this.db
              .select()
              .from(quoteVersionItems)
              .where(inArray(quoteVersionItems.quoteVersionId, versionIds))
              .orderBy(quoteVersionItems.displayOrder),
            this.db
              .select()
              .from(quoteVersionEvents)
              .where(inArray(quoteVersionEvents.quoteVersionId, versionIds))
              .orderBy(desc(quoteVersionEvents.createdAt)),
          ])
        : [[], []];
    const itemsByVersion = groupByVersion(itemRows);
    const eventsByVersion = groupByVersion(eventRows);
    const versions = versionRows.map((version) =>
      mapVersion(version, {
        items: itemsByVersion.get(version.id) ?? [],
        events: eventsByVersion.get(version.id) ?? [],
      }),
    );
    const latestVersion = versions[0];

    return {
      id: quote.id,
      quoteRequestId: quote.quoteRequestId,
      companyId: quote.companyId,
      status: quote.status,
      latestVersionId: latestVersion?.id ?? null,
      latestVersionNumber: latestVersion?.versionNumber ?? null,
      latestProposalCode: latestVersion?.proposalCode ?? null,
      latestVersionStatus: latestVersion?.status ?? null,
      finalTotalCents: latestVersion?.finalTotalCents ?? null,
      validUntil: latestVersion?.validUntil ?? null,
      sentAt: latestVersion?.sentAt ?? null,
      acceptedQuoteVersionId: quote.acceptedQuoteVersionId,
      versions,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    };
  }
}

function mapVersion(
  row: QuoteVersionRow,
  related: {
    items: QuoteVersionItemRow[];
    events: QuoteVersionEventRow[];
  },
): CompanyProposalVersion {
  return {
    id: row.id,
    quoteId: row.quoteId,
    quoteRequestId: row.quoteRequestId,
    companyId: row.companyId,
    versionNumber: row.versionNumber,
    proposalCode: row.proposalCode,
    status: row.status,
    internalTotalCents: decimalMoneyToCents(row.internalTotal),
    estimateMinCents: decimalMoneyToCents(row.estimateMin),
    estimateMaxCents: decimalMoneyToCents(row.estimateMax),
    finalTotalCents: decimalMoneyToCents(row.finalTotal),
    outOfRangeReason: row.outOfRangeReason,
    validUntil: row.validUntil.toISOString(),
    terms: row.terms,
    termsVersion: row.termsVersion,
    sentAt: row.sentAt?.toISOString() ?? null,
    viewedAt: row.viewedAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    expiredAt: row.expiredAt?.toISOString() ?? null,
    snapshot: row.snapshot,
    items: related.items.map((item) => ({
      id: item.id,
      quoteVersionId: item.quoteVersionId,
      itemId: item.itemId,
      label: item.label,
      quantity: item.quantity,
      internalTotalCents: decimalMoneyToCents(item.internalTotal),
      finalTotalCents: decimalMoneyToCents(item.finalTotal),
      snapshot: item.snapshot,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    events: related.events.map((event) => ({
      id: event.id,
      quoteVersionId: event.quoteVersionId,
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actorUserId: event.actorUserId,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function groupByVersion<T extends { quoteVersionId: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    grouped.set(row.quoteVersionId, [...(grouped.get(row.quoteVersionId) ?? []), row]);
  }

  return grouped;
}

async function insertVersionEvent(
  tx: Transaction,
  input: {
    quoteVersionId: string;
    actorUserId: string;
    eventType: string;
    fromStatus: QuoteVersionRow["status"] | null;
    toStatus: QuoteVersionRow["status"] | null;
    metadata: Record<string, unknown>;
    now: Date;
  },
) {
  await tx.insert(quoteVersionEvents).values({
    id: randomUUID(),
    quoteVersionId: input.quoteVersionId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    metadata: input.metadata,
    createdAt: input.now,
  });
}

function decimalMoneyToCents(value: string) {
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
