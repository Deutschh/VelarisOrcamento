import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  auditLogs,
  companies,
  companyInternalNotes,
  companyMembers,
  companyPublicProfiles,
  reviews,
  users,
} from "@velaris/database-schema";
import type { AdminCompanyListQuery, AdminReview } from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import type {
  AdminRepository,
  CreateInternalNoteInput,
  ModerateReviewInput,
  PersistCompanyActionInput,
  PersistedAdminAuditLog,
  PersistedAdminCompany,
  PersistedAdminCompanyNote,
  UpdateCompanyPublicProfileInput,
} from "./admin-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const ownerJoinCondition = and(
  eq(companyMembers.companyId, companies.id),
  eq(companyMembers.role, "owner"),
  eq(companyMembers.status, "active"),
);

function mapCompany(row: {
  company: typeof companies.$inferSelect;
  ownerName: string | null;
  ownerEmail: string | null;
}): PersistedAdminCompany {
  return {
    id: row.company.id,
    tradingName: row.company.tradingName,
    legalName: row.company.legalName,
    documentNumber: row.company.documentNumber,
    slug: row.company.slug,
    timezone: row.company.timezone,
    status: row.company.status,
    profileStatus: row.company.profileStatus,
    subscriptionStatus: row.company.subscriptionStatus,
    activatedAt: row.company.activatedAt,
    suspendedAt: row.company.suspendedAt,
    profilePublishedAt: row.company.profilePublishedAt,
    profileUnpublishedAt: row.company.profileUnpublishedAt,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    createdAt: row.company.createdAt,
  };
}

export class DrizzleAdminRepository implements AdminRepository {
  constructor(private readonly db: Database) {}

  async listCompanies(query: AdminCompanyListQuery): Promise<PersistedAdminCompany[]> {
    const filters = [
      ...(query.status ? [eq(companies.status, query.status)] : []),
      ...(query.profileStatus ? [eq(companies.profileStatus, query.profileStatus)] : []),
    ];

    const baseQuery = this.db
      .select({
        company: companies,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(companies)
      .leftJoin(companyMembers, ownerJoinCondition)
      .leftJoin(users, eq(users.id, companyMembers.userId));

    const rows =
      filters.length > 0
        ? await baseQuery.where(and(...filters)).orderBy(desc(companies.createdAt))
        : await baseQuery.orderBy(desc(companies.createdAt));

    return rows.map(mapCompany);
  }

  async findCompanyById(id: string): Promise<PersistedAdminCompany | null> {
    const [row] = await this.db
      .select({
        company: companies,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(companies)
      .leftJoin(companyMembers, ownerJoinCondition)
      .leftJoin(users, eq(users.id, companyMembers.userId))
      .where(eq(companies.id, id))
      .limit(1);

    return row ? mapCompany(row) : null;
  }

  async findCompanyPublicProfile(companyId: string) {
    const [row] = await this.db
      .select()
      .from(companyPublicProfiles)
      .where(eq(companyPublicProfiles.companyId, companyId))
      .limit(1);

    return row ? mapPublicProfile(row) : null;
  }

  async listCompanyNotes(companyId: string): Promise<PersistedAdminCompanyNote[]> {
    const rows = await this.db
      .select({
        id: companyInternalNotes.id,
        note: companyInternalNotes.note,
        authorName: users.name,
        createdAt: companyInternalNotes.createdAt,
      })
      .from(companyInternalNotes)
      .leftJoin(users, eq(users.id, companyInternalNotes.authorUserId))
      .where(eq(companyInternalNotes.companyId, companyId))
      .orderBy(desc(companyInternalNotes.createdAt));

    return rows;
  }

  async listCompanyAuditLogs(companyId: string): Promise<PersistedAdminAuditLog[]> {
    const rows = await this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actorName: users.name,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.createdAt));

    return rows;
  }

  async listCompanyReviews(companyId: string): Promise<AdminReview[]> {
    const rows = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.companyId, companyId))
      .orderBy(desc(reviews.createdAt));

    return rows.map(mapAdminReview);
  }

  async moderateReview(input: ModerateReviewInput): Promise<AdminReview | null> {
    let companyId: string | null = null;

    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(reviews)
        .where(eq(reviews.id, input.reviewId))
        .limit(1);

      if (!current) {
        return;
      }

      companyId = current.companyId;
      const now = new Date();
      const patch = toReviewModerationPatch(input, now);

      await tx
        .update(reviews)
        .set({
          ...patch,
          updatedAt: now,
        })
        .where(eq(reviews.id, input.reviewId));

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: input.actorUserId,
        companyId: current.companyId,
        action: `review.${input.input.action}`,
        entityType: "review",
        entityId: input.reviewId,
        metadata: {
          reason: input.input.reason ?? null,
          previousStatus: current.status,
          previousSuspicious: current.isSuspicious,
        },
      });

      await refreshCompanyReviewSummary(tx, current.companyId, now);
    });

    if (!companyId) {
      return null;
    }

    const [row] = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.id, input.reviewId))
      .limit(1);

    return row ? mapAdminReview(row) : null;
  }

  async persistCompanyAction(input: PersistCompanyActionInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      const patch = toCompanyUpdate(input.patch);

      if (Object.keys(patch).length > 0) {
        await tx
          .update(companies)
          .set({
            ...patch,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, input.companyId));
      }

      if (input.note) {
        await tx.insert(companyInternalNotes).values({
          id: randomUUID(),
          companyId: input.companyId,
          authorUserId: input.actorUserId,
          note: input.note,
        });
      }

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        action: input.action,
        entityType: "company",
        entityId: input.companyId,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      });
    });
  }

  async createInternalNote(input: CreateInternalNoteInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(companyInternalNotes).values({
        id: randomUUID(),
        companyId: input.companyId,
        authorUserId: input.actorUserId,
        note: input.note,
      });

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        action: "company.internal_note.created",
        entityType: "company",
        entityId: input.companyId,
      });
    });
  }

  async updateCompanyPublicProfile(
    input: UpdateCompanyPublicProfileInput,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const values = toPublicProfilePersistence(input.profile);

      await tx
        .insert(companyPublicProfiles)
        .values({
          companyId: input.companyId,
          ...values,
        })
        .onConflictDoUpdate({
          target: companyPublicProfiles.companyId,
          set: {
            ...values,
            updatedAt: new Date(),
          },
        });

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        action: "company.public_profile.updated",
        entityType: "company_public_profile",
        entityId: input.companyId,
        metadata: {
          nicheCode: input.profile.nicheCode,
          serviceCitiesCount: input.profile.serviceCities.length,
          servicesCount: input.profile.services.length,
        },
      });
    });
  }
}

function toCompanyUpdate(patch: PersistCompanyActionInput["patch"]) {
  return {
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.profileStatus ? { profileStatus: patch.profileStatus } : {}),
    ...(patch.subscriptionStatus ? { subscriptionStatus: patch.subscriptionStatus } : {}),
    ...(patch.activatedAt ? { activatedAt: patch.activatedAt } : {}),
    ...(patch.suspendedAt !== undefined ? { suspendedAt: patch.suspendedAt } : {}),
    ...(patch.profilePublishedAt !== undefined
      ? { profilePublishedAt: patch.profilePublishedAt }
      : {}),
    ...(patch.profileUnpublishedAt !== undefined
      ? { profileUnpublishedAt: patch.profileUnpublishedAt }
      : {}),
  };
}

function mapPublicProfile(
  row: typeof companyPublicProfiles.$inferSelect,
): NonNullable<Awaited<ReturnType<AdminRepository["findCompanyPublicProfile"]>>> {
  return {
    nicheCode: toKnownNiche(row.nicheCode),
    headline: row.headline,
    description: row.description,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    neighborhood: row.neighborhood,
    addressLine: row.addressLine,
    addressComplement: row.addressComplement,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    serviceRadiusKm: toNumber(row.serviceRadiusKm),
    serviceCities: row.serviceCities,
    serviceNeighborhoods: row.serviceNeighborhoods,
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    primaryColor: row.primaryColor,
    contactPhone: row.contactPhone,
    contactWhatsapp: row.contactWhatsapp,
    contactEmail: row.contactEmail,
    websiteUrl: row.websiteUrl,
    instagramUrl: row.instagramUrl,
    terms: row.terms,
    gallery: row.gallery,
    services: row.services,
    reviewAverage: toNumber(row.reviewAverage),
    reviewCount: row.reviewCount,
  };
}

function toPublicProfilePersistence(profile: UpdateCompanyPublicProfileInput["profile"]) {
  return {
    nicheCode: profile.nicheCode,
    headline: profile.headline ?? null,
    description: profile.description ?? null,
    city: profile.city ?? null,
    state: profile.state ?? null,
    postalCode: profile.postalCode ?? null,
    neighborhood: profile.neighborhood ?? null,
    addressLine: profile.addressLine ?? null,
    addressComplement: profile.addressComplement ?? null,
    latitude: toNumeric(profile.latitude),
    longitude: toNumeric(profile.longitude),
    serviceRadiusKm: toNumeric(profile.serviceRadiusKm),
    serviceCities: profile.serviceCities,
    serviceNeighborhoods: profile.serviceNeighborhoods,
    logoUrl: profile.logoUrl ?? null,
    coverImageUrl: profile.coverImageUrl ?? null,
    primaryColor: profile.primaryColor ?? null,
    contactPhone: profile.contactPhone ?? null,
    contactWhatsapp: profile.contactWhatsapp ?? null,
    contactEmail: profile.contactEmail ?? null,
    websiteUrl: profile.websiteUrl ?? null,
    instagramUrl: profile.instagramUrl ?? null,
    terms: profile.terms ?? null,
    gallery: profile.gallery,
    services: profile.services,
  };
}

function mapAdminReview(row: typeof reviews.$inferSelect): AdminReview {
  return {
    id: row.id,
    companyId: row.companyId,
    quoteId: row.quoteId,
    quoteVersionId: row.quoteVersionId,
    quoteRequestId: row.quoteRequestId,
    appointmentId: row.appointmentId,
    requestCode: row.requestCode,
    proposalCode: row.proposalCode,
    serviceName: row.serviceName,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    isSuspicious: row.isSuspicious,
    moderationReason: row.moderationReason,
    moderatedByUserId: row.moderatedByUserId,
    moderatedAt: row.moderatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toReviewModerationPatch(input: ModerateReviewInput, now: Date) {
  if (input.input.action === "hide") {
    return {
      status: "hidden" as const,
      moderationReason: input.input.reason ?? null,
      moderatedByUserId: input.actorUserId,
      moderatedAt: now,
    };
  }

  if (input.input.action === "restore") {
    return {
      status: "visible" as const,
      moderationReason: input.input.reason ?? null,
      moderatedByUserId: input.actorUserId,
      moderatedAt: now,
    };
  }

  if (input.input.action === "flag_suspicious") {
    return {
      isSuspicious: true,
      moderationReason: input.input.reason ?? null,
      moderatedByUserId: input.actorUserId,
      moderatedAt: now,
    };
  }

  return {
    isSuspicious: false,
    moderationReason: input.input.reason ?? null,
    moderatedByUserId: input.actorUserId,
    moderatedAt: now,
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

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}

function toNumeric(value: number | undefined) {
  return value === undefined ? null : String(value);
}

function toKnownNiche(value: string) {
  if (value === "cleaning_upholstery" || value === "glasswork" || value === "stonework") {
    return value;
  }

  return "cleaning_upholstery";
}
