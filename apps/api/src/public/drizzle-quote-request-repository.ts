import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, ne, or } from "drizzle-orm";

import {
  appointmentHistory,
  appointments,
  companyPublicProfiles,
  idempotencyKeys,
  notifications,
  publicAccessTokens,
  quoteAcceptances,
  quotes,
  quoteRequestAnswers,
  quoteRequestCalculations,
  quoteRequestFiles,
  quoteRequests,
  quoteVersions,
  quoteVersionItems,
  quoteVersionEvents,
  recoveryCodes,
  reviews,
} from "@velaris/database-schema";
import {
  quoteDraftDataSchema,
  type AppointmentStatus,
  type CompanyAppointment,
  type CompanyAppointmentConflict,
  type CompanyAppointmentHistory,
  type CompanyProposalSummary,
  type PublicCompanyReview,
  type PublicProposalAcceptance,
  type PublicProposalDetail,
  type PublicProposalItem,
  type PublicProposalVersion,
  type QuoteDraftFileSummary,
} from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import type {
  AddDraftFileInput,
  CreateNotificationInput,
  CreateDraftRecordInput,
  CreateRecoveryCodeInput,
  CreateReviewInput,
  IdempotencyRecord,
  PersistedQuoteRequest,
  PublicQuoteRequestRepository,
  QuoteRequestAnswerInput,
  RecoveryCodeRecord,
  ReplacePublicTokenAfterRecoveryInput,
  SaveCalculationInput,
  SubmitDraftInput,
  UpdateDraftRecordInput,
  AcceptProposalInput,
  ProposalActionIdempotencyRecord,
  RejectProposalInput,
  ReviewIdempotencyRecord,
  StoredQuoteRequestFile,
} from "./quote-request-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type QuoteRequestRow = typeof quoteRequests.$inferSelect;
type QuoteRequestFileRow = typeof quoteRequestFiles.$inferSelect;
type RecoveryCodeRow = typeof recoveryCodes.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;
type AppointmentHistoryRow = typeof appointmentHistory.$inferSelect;
type QuoteRow = typeof quotes.$inferSelect;
type QuoteVersionRow = typeof quoteVersions.$inferSelect;
type QuoteVersionItemRow = typeof quoteVersionItems.$inferSelect;
type QuoteAcceptanceRow = typeof quoteAcceptances.$inferSelect;
type ReviewRow = typeof reviews.$inferSelect;
type ProposalRow = {
  quote: QuoteRow;
  version: QuoteVersionRow | null;
};

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

  async findByPublicTokenHash(input: {
    publicTokenHash: string;
    now: Date;
  }): Promise<PersistedQuoteRequest | null> {
    const [row] = await this.db
      .select({
        request: quoteRequests,
      })
      .from(publicAccessTokens)
      .innerJoin(quoteRequests, eq(quoteRequests.id, publicAccessTokens.entityId))
      .where(
        and(
          eq(publicAccessTokens.tokenHash, input.publicTokenHash),
          eq(publicAccessTokens.entityType, "quote_request"),
          isNull(publicAccessTokens.revokedAt),
          or(
            isNull(publicAccessTokens.expiresAt),
            gt(publicAccessTokens.expiresAt, input.now),
          ),
          ne(quoteRequests.status, "draft"),
        ),
      )
      .limit(1);

    return row ? this.mapQuoteRequest(row.request) : null;
  }

  async findSubmittedByRequestCode(
    requestCode: string,
  ): Promise<PersistedQuoteRequest | null> {
    const [row] = await this.db
      .select()
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.requestCode, requestCode),
          ne(quoteRequests.status, "draft"),
        ),
      )
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
        storageProvider: "database",
        content: input.content,
        status: "uploaded",
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to persist quote request file metadata.");
    }

    return mapFile(row);
  }

  async findStoredFile(input: {
    quoteRequestId: string;
    fileId: string;
  }): Promise<StoredQuoteRequestFile | null> {
    const [row] = await this.db
      .select({
        id: quoteRequestFiles.id,
        fileName: quoteRequestFiles.fileName,
        mimeType: quoteRequestFiles.mimeType,
        content: quoteRequestFiles.content,
      })
      .from(quoteRequestFiles)
      .where(
        and(
          eq(quoteRequestFiles.id, input.fileId),
          eq(quoteRequestFiles.quoteRequestId, input.quoteRequestId),
        ),
      );

    return row ?? null;
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

  async listProposalSummaries(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyProposalSummary[]> {
    const rows = await this.db
      .select({
        quote: quotes,
        version: quoteVersions,
      })
      .from(quotes)
      .leftJoin(quoteVersions, eq(quoteVersions.quoteId, quotes.id))
      .where(
        and(
          eq(quotes.companyId, input.companyId),
          eq(quotes.quoteRequestId, input.quoteRequestId),
        ),
      )
      .orderBy(desc(quoteVersions.versionNumber));

    return mapProposalSummaries(rows);
  }

  async findLatestPublicProposal(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PublicProposalDetail | null> {
    const rows = await this.db
      .select({
        quote: quotes,
        version: quoteVersions,
      })
      .from(quotes)
      .leftJoin(quoteVersions, eq(quoteVersions.quoteId, quotes.id))
      .where(
        and(
          eq(quotes.companyId, input.companyId),
          eq(quotes.quoteRequestId, input.quoteRequestId),
        ),
      )
      .orderBy(desc(quoteVersions.versionNumber));

    const summary = mapProposalSummaries(rows)[0];

    if (!summary?.latestVersionId) {
      return null;
    }

    const [versionRow] = await this.db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.id, summary.latestVersionId))
      .limit(1);

    if (!versionRow) {
      return null;
    }

    const [itemRows, acceptanceRows] = await Promise.all([
      this.db
        .select()
        .from(quoteVersionItems)
        .where(eq(quoteVersionItems.quoteVersionId, versionRow.id))
        .orderBy(quoteVersionItems.displayOrder),
      this.db
        .select()
        .from(quoteAcceptances)
        .where(eq(quoteAcceptances.quoteVersionId, versionRow.id))
        .limit(1),
    ]);

    return {
      ...summary,
      latestVersion: mapPublicProposalVersion(versionRow, itemRows),
      acceptance: acceptanceRows[0]
        ? mapPublicProposalAcceptance(acceptanceRows[0])
        : null,
    };
  }

  async findProposalActionIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ProposalActionIdempotencyRecord | null> {
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
            row.responseBody as unknown as ProposalActionIdempotencyRecord["responseBody"],
          statusCode: row.statusCode,
          expiresAt: row.expiresAt.toISOString(),
        }
      : null;
  }

  async findReviewIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ReviewIdempotencyRecord | null> {
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
            row.responseBody as unknown as ReviewIdempotencyRecord["responseBody"],
          statusCode: row.statusCode,
          expiresAt: row.expiresAt.toISOString(),
        }
      : null;
  }

  async findReviewByAppointmentId(
    appointmentId: string,
  ): Promise<PublicCompanyReview | null> {
    const [row] = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.appointmentId, appointmentId))
      .limit(1);

    return row ? mapPublicReview(row) : null;
  }

  async createReview(input: CreateReviewInput): Promise<PublicCompanyReview> {
    await this.db.transaction(async (tx) => {
      await tx.insert(reviews).values({
        id: input.id,
        companyId: input.companyId,
        quoteId: input.quoteId,
        quoteVersionId: input.quoteVersionId,
        quoteRequestId: input.quoteRequestId,
        appointmentId: input.appointmentId,
        customerProfileId: input.customerProfileId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        requestCode: input.requestCode,
        proposalCode: input.proposalCode,
        serviceName: input.serviceName,
        rating: input.rating,
        comment: input.comment,
        status: "visible",
        isSuspicious: false,
        metadata: input.metadata,
        createdAt: input.now,
        updatedAt: input.now,
      });

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

      await refreshCompanyReviewSummary(tx, input.companyId, input.now);
    });

    const review = await this.findReviewByAppointmentId(input.appointmentId);

    if (!review) {
      throw new Error("Review could not be reloaded.");
    }

    return review;
  }

  async acceptProposal(input: AcceptProposalInput): Promise<PublicProposalDetail> {
    await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quoteVersions)
        .set({
          status: input.toStatus,
          acceptedAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteVersions.id, input.quoteVersionId),
            eq(quoteVersions.quoteId, input.quoteId),
            eq(quoteVersions.status, input.fromStatus),
          ),
        )
        .returning({ id: quoteVersions.id });

      if (rows.length === 0) {
        throw new Error("Proposal version could not be accepted.");
      }

      await tx
        .update(quotes)
        .set({
          status: input.quoteStatus,
          acceptedQuoteVersionId: input.quoteVersionId,
          updatedAt: input.now,
        })
        .where(eq(quotes.id, input.quoteId));

      await tx.insert(quoteVersionEvents).values({
        id: randomUUID(),
        quoteVersionId: input.quoteVersionId,
        eventType: "proposal.accepted",
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorUserId: null,
        metadata: {
          quoteId: input.quoteId,
          quoteRequestId: input.quoteRequestId,
          proposalCode: input.proposalCode,
          source: "public_tracking",
        },
        createdAt: input.now,
      });

      await tx.insert(quoteAcceptances).values({
        id: input.id,
        quoteId: input.quoteId,
        quoteVersionId: input.quoteVersionId,
        quoteRequestId: input.quoteRequestId,
        companyId: input.companyId,
        requestCode: input.requestCode,
        proposalCode: input.proposalCode,
        customerName: input.customerName,
        customerWhatsapp: input.customerWhatsapp,
        customerEmail: input.customerEmail,
        finalTotal: centsToDecimalMoney(input.finalTotalCents),
        termsVersion: input.termsVersion,
        privacyPolicyVersion: input.privacyPolicyVersion,
        estimateDisclaimerVersion: input.estimateDisclaimerVersion,
        companyTermsVersion: input.companyTermsVersion,
        legalSnapshot: input.legalSnapshot,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
        acceptedAt: input.now,
        createdAt: input.now,
      });

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

    const proposal = await this.findLatestPublicProposal({
      companyId: input.companyId,
      quoteRequestId: input.quoteRequestId,
    });

    if (!proposal) {
      throw new Error("Accepted proposal could not be reloaded.");
    }

    return proposal;
  }

  async rejectProposal(input: RejectProposalInput): Promise<PublicProposalDetail> {
    await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quoteVersions)
        .set({
          status: input.toStatus,
          rejectedAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(quoteVersions.id, input.quoteVersionId),
            eq(quoteVersions.quoteId, input.quoteId),
            eq(quoteVersions.status, input.fromStatus),
          ),
        )
        .returning({ id: quoteVersions.id });

      if (rows.length === 0) {
        throw new Error("Proposal version could not be rejected.");
      }

      await tx
        .update(quotes)
        .set({
          status: input.quoteStatus,
          updatedAt: input.now,
        })
        .where(eq(quotes.id, input.quoteId));

      await tx.insert(quoteVersionEvents).values({
        id: randomUUID(),
        quoteVersionId: input.quoteVersionId,
        eventType: "proposal.rejected",
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorUserId: null,
        metadata: {
          quoteId: input.quoteId,
          reasonCode: input.reasonCode,
          reason: input.reason,
          source: "public_tracking",
        },
        createdAt: input.now,
      });

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

    const proposal = await this.findLatestPublicProposal({
      companyId: input.companyId,
      quoteRequestId: input.quoteRequestId,
    });

    if (!proposal) {
      throw new Error("Rejected proposal could not be reloaded.");
    }

    return proposal;
  }

  async listAppointments(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyAppointment[]> {
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
          eq(appointments.quoteRequestId, input.quoteRequestId),
        ),
      )
      .orderBy(desc(appointments.updatedAt));

    return Promise.all(rows.map((row) => this.mapAppointment(row)));
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

  async createRecoveryCode(input: CreateRecoveryCodeInput): Promise<RecoveryCodeRecord> {
    const [row] = await this.db
      .insert(recoveryCodes)
      .values({
        id: input.id,
        quoteRequestId: input.quoteRequestId,
        requestCode: input.requestCode,
        contactType: input.contactType,
        contactHash: input.contactHash,
        tokenHash: input.tokenHash,
        otpHash: input.otpHash,
        maxAttempts: input.maxAttempts,
        expiresAt: input.expiresAt,
        metadata: input.metadata,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!row) {
      throw new Error("Recovery code could not be persisted.");
    }

    return mapRecoveryCode(row);
  }

  async findRecoveryCodeByTokenHash(
    tokenHash: string,
  ): Promise<RecoveryCodeRecord | null> {
    const [row] = await this.db
      .select()
      .from(recoveryCodes)
      .where(eq(recoveryCodes.tokenHash, tokenHash))
      .limit(1);

    return row ? mapRecoveryCode(row) : null;
  }

  async recordRecoveryAttempt(input: {
    recoveryCodeId: string;
    attempts: number;
    revokedAt: Date | null;
    now: Date;
  }): Promise<void> {
    const changes: Partial<typeof recoveryCodes.$inferInsert> = {
      attempts: input.attempts,
      updatedAt: input.now,
    };

    if (input.revokedAt) {
      changes.revokedAt = input.revokedAt;
    }

    await this.db
      .update(recoveryCodes)
      .set(changes)
      .where(eq(recoveryCodes.id, input.recoveryCodeId));
  }

  async replacePublicTokenAfterRecovery(
    input: ReplacePublicTokenAfterRecoveryInput,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (input.previousPublicTokenId) {
        await tx
          .update(publicAccessTokens)
          .set({
            revokedAt: input.now,
            updatedAt: input.now,
          })
          .where(eq(publicAccessTokens.id, input.previousPublicTokenId));
      }

      await tx.insert(publicAccessTokens).values({
        id: input.newPublicTokenId,
        tokenHash: input.newPublicTokenHash,
        entityType: "quote_request",
        entityId: input.quoteRequestId,
        expiresAt: input.newPublicTokenExpiresAt,
        metadata: {
          requestCode: input.requestCode,
          recoveryCodeId: input.recoveryCodeId,
          replacesTokenId: input.previousPublicTokenId,
        },
        createdAt: input.now,
        updatedAt: input.now,
      });

      await tx
        .update(quoteRequests)
        .set({
          publicTokenId: input.newPublicTokenId,
          updatedAt: input.now,
        })
        .where(eq(quoteRequests.id, input.quoteRequestId));

      await tx
        .update(recoveryCodes)
        .set({
          usedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(recoveryCodes.id, input.recoveryCodeId));
    });
  }

  async createNotification(input: CreateNotificationInput): Promise<void> {
    await this.db.insert(notifications).values({
      id: input.id,
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: input.now,
      updatedAt: input.now,
    });
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

  private async mapAppointment(row: {
    appointment: AppointmentRow;
    version: QuoteVersionRow;
  }): Promise<CompanyAppointment> {
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
}

function mapRecoveryCode(row: RecoveryCodeRow): RecoveryCodeRecord {
  return {
    id: row.id,
    quoteRequestId: row.quoteRequestId,
    requestCode: row.requestCode,
    contactType: row.contactType as RecoveryCodeRecord["contactType"],
    contactHash: row.contactHash,
    tokenHash: row.tokenHash,
    otpHash: row.otpHash,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    expiresAt: row.expiresAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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

function mapProposalSummaries(rows: ProposalRow[]): CompanyProposalSummary[] {
  const grouped = new Map<
    string,
    {
      quote: QuoteRow;
      versions: QuoteVersionRow[];
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
    storageProvider: row.storageProvider === "database" ? "database" : "stub",
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPublicProposalVersion(
  row: QuoteVersionRow,
  itemRows: QuoteVersionItemRow[],
): PublicProposalVersion {
  return {
    id: row.id,
    quoteId: row.quoteId,
    quoteRequestId: row.quoteRequestId,
    companyId: row.companyId,
    versionNumber: row.versionNumber,
    proposalCode: row.proposalCode,
    status: row.status,
    estimateMinCents: decimalMoneyToCents(row.estimateMin) ?? 0,
    estimateMaxCents: decimalMoneyToCents(row.estimateMax) ?? 0,
    finalTotalCents: decimalMoneyToCents(row.finalTotal) ?? 0,
    outOfRangeReason: row.outOfRangeReason,
    validUntil: row.validUntil.toISOString(),
    terms: row.terms,
    termsVersion: row.termsVersion,
    sentAt: row.sentAt?.toISOString() ?? null,
    viewedAt: row.viewedAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    expiredAt: row.expiredAt?.toISOString() ?? null,
    items: itemRows.map(mapPublicProposalItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPublicProposalItem(row: QuoteVersionItemRow): PublicProposalItem {
  return {
    id: row.id,
    quoteVersionId: row.quoteVersionId,
    itemId: row.itemId,
    label: row.label,
    quantity: row.quantity,
    finalTotalCents: decimalMoneyToCents(row.finalTotal) ?? 0,
    snapshot: row.snapshot,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPublicProposalAcceptance(row: QuoteAcceptanceRow): PublicProposalAcceptance {
  return {
    id: row.id,
    quoteId: row.quoteId,
    quoteVersionId: row.quoteVersionId,
    quoteRequestId: row.quoteRequestId,
    companyId: row.companyId,
    requestCode: row.requestCode,
    proposalCode: row.proposalCode,
    finalTotalCents: decimalMoneyToCents(row.finalTotal) ?? 0,
    termsVersion: row.termsVersion,
    privacyPolicyVersion: row.privacyPolicyVersion,
    estimateDisclaimerVersion: row.estimateDisclaimerVersion,
    companyTermsVersion: row.companyTermsVersion,
    acceptedAt: row.acceptedAt.toISOString(),
  };
}

function mapPublicReview(row: ReviewRow): PublicCompanyReview {
  return {
    id: row.id,
    companyId: row.companyId,
    quoteRequestId: row.quoteRequestId,
    appointmentId: row.appointmentId,
    requestCode: row.requestCode,
    serviceName: row.serviceName,
    customerName: row.customerName,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  };
}

async function refreshCompanyReviewSummary(
  tx: Transaction,
  companyId: string,
  now: Date,
) {
  const rows = await tx
    .select({ rating: reviews.rating })
    .from(reviews)
    .where(and(eq(reviews.companyId, companyId), eq(reviews.status, "visible")));

  const count = rows.length;
  const average =
    count === 0
      ? null
      : (rows.reduce((total, row) => total + row.rating, 0) / count).toFixed(2);

  await tx
    .update(companyPublicProfiles)
    .set({
      reviewAverage: average,
      reviewCount: count,
      updatedAt: now,
    })
    .where(eq(companyPublicProfiles.companyId, companyId));
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
