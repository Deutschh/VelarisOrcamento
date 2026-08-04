import { randomUUID } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  appointments,
  auditLogs,
  companies,
  companyConfigurations,
  companyPublicProfiles,
  companyServices,
  priceChangeRequests,
  quoteRequestFiles,
  quoteRequests,
  quoteVersions,
  reviews,
  templateServices,
  users,
} from "@velaris/database-schema";
import type {
  AdminAuditLogQuery,
  AdminCompanyRankingMetric,
  AdminCompanyRequestMetric,
  AdminMetricsQuery,
  AdminNicheMetric,
  AdminOperationalMetricsResponse,
  AdminPriceChangeRequestListQuery,
  CompanyOperationalMetricsResponse,
  MetricsCompanySummary,
  MetricsPeriodQuery,
  MetricsPeriodSummary,
  OperationalAuditLogSummary,
  OperationalMetricsTotals,
  PriceChangeRequestStatus,
  PriceChangeRequestSummary,
  PublicCompanyCategoryCode,
} from "@velaris/shared";

import type { createDatabaseClient } from "../db/client.js";
import { getCategoryLabel, toKnownCategoryCode } from "../public/public-profile.js";
import type {
  CreatePriceChangeRequestInput,
  OperationalMetricsRepository,
  ResolvePriceChangeRequestInput,
} from "./operational-metrics-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type CompanyRow = typeof companies.$inferSelect;
type ProfileRow = typeof companyPublicProfiles.$inferSelect | null;
type QuoteRequestMetricRow = Awaited<
  ReturnType<DrizzleOperationalMetricsRepository["selectMetricQuoteRequests"]>
>[number];
type QuoteVersionMetricRow = Awaited<
  ReturnType<DrizzleOperationalMetricsRepository["selectMetricQuoteVersions"]>
>[number];
type AppointmentMetricRow = Awaited<
  ReturnType<DrizzleOperationalMetricsRepository["selectMetricAppointments"]>
>[number];
type ReviewMetricRow = Awaited<
  ReturnType<DrizzleOperationalMetricsRepository["selectMetricReviews"]>
>[number];
type PriceChangeMetricRow = Awaited<
  ReturnType<DrizzleOperationalMetricsRepository["selectMetricPriceChangeRequests"]>
>[number];

const requestedUsers = alias(users, "requested_users");
const resolvedUsers = alias(users, "resolved_users");
const actorUsers = alias(users, "actor_users");

const sentProposalStatuses = ["sent", "viewed", "accepted", "rejected", "expired"];
const viewedProposalStatuses = ["viewed", "accepted", "rejected"];

export class DrizzleOperationalMetricsRepository implements OperationalMetricsRepository {
  constructor(private readonly db: Database) {}

  async getCompanyMetrics(input: {
    companyId: string;
    query: MetricsPeriodQuery;
  }): Promise<CompanyOperationalMetricsResponse> {
    const period = normalizePeriod(input.query);
    const [
      companyRows,
      requestRows,
      versionRows,
      appointmentRows,
      reviewRows,
      auditRows,
      priceChangeRequestRows,
    ] = await Promise.all([
      this.selectCompanies(),
      this.selectMetricQuoteRequests(input.companyId),
      this.selectMetricQuoteVersions(input.companyId),
      this.selectMetricAppointments(input.companyId),
      this.selectMetricReviews(input.companyId),
      this.selectAuditLogs({ ...input.query, companyId: input.companyId }),
      this.listCompanyPriceChangeRequests(input.companyId),
    ]);
    const companyById = mapCompanies(companyRows);

    return {
      period: period.summary,
      totals: calculateTotals({
        requestRows: requestRows.filter((row) =>
          isInPeriod(requestMetricDate(row), period),
        ),
        versionRows,
        appointmentRows,
        reviewRows,
        period,
      }),
      priceChangeRequests: priceChangeRequestRows,
      recentAuditLogs: auditRows
        .filter((row) => isInPeriod(row.createdAt, period))
        .slice(0, 8)
        .map((row) => mapAuditLog(row, companyById)),
    };
  }

  async getAdminMetrics(
    query: AdminMetricsQuery,
  ): Promise<AdminOperationalMetricsResponse> {
    const period = normalizePeriod(query);
    const [
      companyRows,
      requestRows,
      versionRows,
      appointmentRows,
      reviewRows,
      fileRows,
      priceChangeRows,
    ] = await Promise.all([
      this.selectCompanies(),
      this.selectMetricQuoteRequests(),
      this.selectMetricQuoteVersions(),
      this.selectMetricAppointments(),
      this.selectMetricReviews(),
      this.selectMetricFiles(),
      this.selectMetricPriceChangeRequests(),
    ]);
    const scopedCompanies = companyRows.filter((row) =>
      companyMatchesAdminQuery(row, query),
    );
    const scopedCompanyIds = new Set(scopedCompanies.map((row) => row.company.id));
    const companyById = mapCompanies(companyRows);
    const scopedRequestRows = requestRows.filter((row) =>
      scopedCompanyIds.has(row.request.companyId),
    );
    const periodRequestRows = scopedRequestRows.filter((row) =>
      isInPeriod(requestMetricDate(row), period),
    );
    const scopedVersionRows = versionRows.filter((row) =>
      scopedCompanyIds.has(row.version.companyId),
    );
    const scopedAppointmentRows = appointmentRows.filter((row) =>
      scopedCompanyIds.has(row.appointment.companyId),
    );
    const scopedReviewRows = reviewRows.filter((row) =>
      scopedCompanyIds.has(row.companyId),
    );
    const scopedPriceChangeRows = priceChangeRows.filter((row) =>
      scopedCompanyIds.has(row.companyId),
    );
    const scopedFileRows = fileRows.filter((row) => scopedCompanyIds.has(row.companyId));
    const totals = calculateTotals({
      requestRows: periodRequestRows,
      versionRows: scopedVersionRows,
      appointmentRows: scopedAppointmentRows,
      reviewRows: scopedReviewRows,
      period,
    });

    return {
      period: period.summary,
      companies: {
        pending: countCompanies(scopedCompanies, "pending"),
        active: countCompanies(scopedCompanies, "active"),
        suspended: countCompanies(scopedCompanies, "suspended"),
      },
      totals,
      requestsByCompany: buildRequestsByCompany(periodRequestRows, companyById),
      requestsByNiche: buildRequestsByNiche(
        scopedCompanies,
        periodRequestRows,
        scopedVersionRows,
        period,
      ),
      conversionByNiche: buildRequestsByNiche(
        scopedCompanies,
        periodRequestRows,
        scopedVersionRows,
        period,
      ).sort((left, right) => right.conversionRateBps - left.conversionRateBps),
      ranking: buildCompanyRanking({
        companyRows: scopedCompanies,
        requestRows: periodRequestRows,
        versionRows: scopedVersionRows,
        period,
      }),
      storageUsageBytes: scopedFileRows.reduce((total, row) => total + row.sizeBytes, 0),
      priceChangeRequests: summarizePriceChangeRequests(
        scopedPriceChangeRows.filter((row) => isInPeriod(row.createdAt, period)),
      ),
    };
  }

  async listAdminAuditLogs(
    query: AdminAuditLogQuery,
  ): Promise<OperationalAuditLogSummary[]> {
    const period = normalizePeriod(query);
    const [companyRows, auditRows] = await Promise.all([
      this.selectCompanies(),
      this.selectAuditLogs(query),
    ]);
    const companyById = mapCompanies(companyRows);
    const actionFilter = query.action?.trim().toLowerCase();

    return auditRows
      .filter((row) => isInPeriod(row.createdAt, period))
      .filter((row) => !query.companyId || row.companyId === query.companyId)
      .filter((row) => !actionFilter || row.action.toLowerCase().includes(actionFilter))
      .slice(0, 50)
      .map((row) => mapAuditLog(row, companyById));
  }

  async listCompanyPriceChangeRequests(
    companyId: string,
  ): Promise<PriceChangeRequestSummary[]> {
    const rows = await this.selectPriceChangeRequests({ companyId });
    return rows.map(mapPriceChangeRequest);
  }

  async createPriceChangeRequest(
    input: CreatePriceChangeRequestInput,
  ): Promise<PriceChangeRequestSummary | null> {
    let created = false;

    await this.db.transaction(async (tx) => {
      if (input.input.serviceId) {
        const [service] = await tx
          .select({ id: companyServices.id })
          .from(companyServices)
          .innerJoin(
            companyConfigurations,
            eq(companyConfigurations.id, companyServices.companyConfigurationId),
          )
          .where(
            and(
              eq(companyServices.id, input.input.serviceId),
              eq(companyConfigurations.companyId, input.companyId),
            ),
          )
          .limit(1);

        if (!service) {
          return;
        }
      }

      await tx.insert(priceChangeRequests).values({
        id: input.id,
        companyId: input.companyId,
        requestedByUserId: input.actorUserId,
        serviceId: input.input.serviceId ?? null,
        status: "open",
        title: input.input.title,
        description: input.input.description,
        metadata: {
          source: "company_panel",
        },
        createdAt: input.now,
        updatedAt: input.now,
      });

      await insertAuditLog(tx, {
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        action: "price_change_request.created",
        entityId: input.id,
        metadata: {
          serviceId: input.input.serviceId ?? null,
          title: input.input.title,
        },
      });

      created = true;
    });

    if (!created) {
      return null;
    }

    const [row] = await this.selectPriceChangeRequests({ requestId: input.id });
    return row ? mapPriceChangeRequest(row) : null;
  }

  async listAdminPriceChangeRequests(
    query: AdminPriceChangeRequestListQuery,
  ): Promise<PriceChangeRequestSummary[]> {
    const rows = await this.selectPriceChangeRequests(query);
    return rows.map(mapPriceChangeRequest);
  }

  async resolvePriceChangeRequest(
    input: ResolvePriceChangeRequestInput,
  ): Promise<PriceChangeRequestSummary | null> {
    let updated = false;

    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(priceChangeRequests)
        .where(eq(priceChangeRequests.id, input.requestId))
        .limit(1);

      if (!current) {
        return;
      }

      const resolvedAt = input.input.status === "under_review" ? null : input.now;

      await tx
        .update(priceChangeRequests)
        .set({
          status: input.input.status,
          resolutionNote: input.input.resolutionNote ?? null,
          resolvedByUserId:
            input.input.status === "under_review" ? null : input.actorUserId,
          resolvedAt,
          updatedAt: input.now,
        })
        .where(eq(priceChangeRequests.id, input.requestId));

      await insertAuditLog(tx, {
        actorUserId: input.actorUserId,
        companyId: current.companyId,
        action: "price_change_request.resolved",
        entityId: input.requestId,
        metadata: {
          previousStatus: current.status,
          status: input.input.status,
          resolutionNote: input.input.resolutionNote ?? null,
        },
      });

      updated = true;
    });

    if (!updated) {
      return null;
    }

    const [row] = await this.selectPriceChangeRequests({
      requestId: input.requestId,
    });
    return row ? mapPriceChangeRequest(row) : null;
  }

  selectMetricQuoteRequests(companyId?: string) {
    const query = this.db
      .select({
        request: quoteRequests,
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(quoteRequests)
      .innerJoin(companies, eq(companies.id, quoteRequests.companyId))
      .leftJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .where(
        companyId
          ? and(eq(quoteRequests.companyId, companyId), ne(quoteRequests.status, "draft"))
          : ne(quoteRequests.status, "draft"),
      )
      .orderBy(desc(quoteRequests.updatedAt));

    return query;
  }

  selectMetricQuoteVersions(companyId?: string) {
    const query = this.db
      .select({
        version: quoteVersions,
        requestSubmittedAt: quoteRequests.submittedAt,
        requestCreatedAt: quoteRequests.createdAt,
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(quoteVersions)
      .innerJoin(quoteRequests, eq(quoteRequests.id, quoteVersions.quoteRequestId))
      .innerJoin(companies, eq(companies.id, quoteVersions.companyId))
      .leftJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .where(
        companyId
          ? and(eq(quoteVersions.companyId, companyId), ne(quoteVersions.status, "draft"))
          : ne(quoteVersions.status, "draft"),
      )
      .orderBy(desc(quoteVersions.updatedAt));

    return query;
  }

  selectMetricAppointments(companyId?: string) {
    const query = this.db
      .select({
        appointment: appointments,
      })
      .from(appointments)
      .where(companyId ? eq(appointments.companyId, companyId) : undefined)
      .orderBy(desc(appointments.updatedAt));

    return query;
  }

  selectMetricReviews(companyId?: string) {
    const query = this.db
      .select()
      .from(reviews)
      .where(companyId ? eq(reviews.companyId, companyId) : undefined)
      .orderBy(desc(reviews.createdAt));

    return query;
  }

  selectMetricFiles() {
    return this.db
      .select({
        companyId: quoteRequests.companyId,
        sizeBytes: quoteRequestFiles.sizeBytes,
      })
      .from(quoteRequestFiles)
      .innerJoin(quoteRequests, eq(quoteRequests.id, quoteRequestFiles.quoteRequestId));
  }

  selectMetricPriceChangeRequests() {
    return this.db.select().from(priceChangeRequests);
  }

  private selectCompanies() {
    return this.db
      .select({
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(companies)
      .leftJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id));
  }

  private selectAuditLogs(query: AdminAuditLogQuery) {
    return this.db
      .select({
        id: auditLogs.id,
        companyId: auditLogs.companyId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorName: actorUsers.name,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(actorUsers, eq(actorUsers.id, auditLogs.actorUserId))
      .where(query.companyId ? eq(auditLogs.companyId, query.companyId) : undefined)
      .orderBy(desc(auditLogs.createdAt));
  }

  private selectPriceChangeRequests(query: {
    requestId?: string | undefined;
    companyId?: string | undefined;
    status?: PriceChangeRequestStatus | undefined;
  }) {
    const filters = [
      ...(query.requestId ? [eq(priceChangeRequests.id, query.requestId)] : []),
      ...(query.companyId ? [eq(priceChangeRequests.companyId, query.companyId)] : []),
      ...(query.status ? [eq(priceChangeRequests.status, query.status)] : []),
    ];

    const baseQuery = this.db
      .select({
        priceChangeRequest: priceChangeRequests,
        company: companies,
        profile: companyPublicProfiles,
        serviceName: templateServices.name,
        requestedByName: requestedUsers.name,
        requestedByEmail: requestedUsers.email,
        resolvedByName: resolvedUsers.name,
      })
      .from(priceChangeRequests)
      .innerJoin(companies, eq(companies.id, priceChangeRequests.companyId))
      .leftJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .leftJoin(companyServices, eq(companyServices.id, priceChangeRequests.serviceId))
      .leftJoin(
        templateServices,
        eq(templateServices.id, companyServices.templateServiceId),
      )
      .leftJoin(
        requestedUsers,
        eq(requestedUsers.id, priceChangeRequests.requestedByUserId),
      )
      .leftJoin(
        resolvedUsers,
        eq(resolvedUsers.id, priceChangeRequests.resolvedByUserId),
      );

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    return whereClause
      ? baseQuery.where(whereClause).orderBy(desc(priceChangeRequests.createdAt))
      : baseQuery.orderBy(desc(priceChangeRequests.createdAt));
  }
}

function normalizePeriod(query: MetricsPeriodQuery): {
  start: Date | null;
  end: Date | null;
  summary: MetricsPeriodSummary;
} {
  const start = query.periodStart ? new Date(query.periodStart) : null;
  const end = query.periodEnd ? new Date(query.periodEnd) : null;

  return {
    start,
    end,
    summary: {
      periodStart: start?.toISOString() ?? null,
      periodEnd: end?.toISOString() ?? null,
    },
  };
}

function isInPeriod(
  value: Date | string | null,
  period: { start: Date | null; end: Date | null },
) {
  if (!value) {
    return false;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const time = date.getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  if (period.start && time < period.start.getTime()) {
    return false;
  }

  if (period.end && time > period.end.getTime()) {
    return false;
  }

  return true;
}

function mapCompanies(
  rows: Array<{ company: CompanyRow; profile: ProfileRow }>,
): Map<string, MetricsCompanySummary> {
  return new Map(
    rows.map((row) => [row.company.id, mapCompany(row.company, row.profile)]),
  );
}

function mapCompany(company: CompanyRow, profile: ProfileRow): MetricsCompanySummary {
  const nicheCode = toKnownCategoryCode(profile?.nicheCode ?? "cleaning_upholstery");

  return {
    id: company.id,
    tradingName: company.tradingName,
    slug: company.slug,
    nicheCode,
    nicheLabel: getCategoryLabel(nicheCode),
  };
}

function companyMatchesAdminQuery(
  row: { company: CompanyRow; profile: ProfileRow },
  query: AdminMetricsQuery,
) {
  if (query.companyId && row.company.id !== query.companyId) {
    return false;
  }

  if (query.nicheCode) {
    return (
      toKnownCategoryCode(row.profile?.nicheCode ?? "cleaning_upholstery") ===
      query.nicheCode
    );
  }

  return true;
}

function requestMetricDate(row: QuoteRequestMetricRow) {
  return row.request.submittedAt ?? row.request.createdAt;
}

function versionSentDate(row: QuoteVersionMetricRow) {
  return row.version.sentAt ?? row.version.createdAt;
}

function versionViewedDate(row: QuoteVersionMetricRow) {
  return row.version.viewedAt ?? null;
}

function versionAcceptedDate(row: QuoteVersionMetricRow) {
  return row.version.acceptedAt ?? null;
}

function calculateTotals(input: {
  requestRows: QuoteRequestMetricRow[];
  versionRows: QuoteVersionMetricRow[];
  appointmentRows: AppointmentMetricRow[];
  reviewRows: ReviewMetricRow[];
  period: { start: Date | null; end: Date | null };
}): OperationalMetricsTotals {
  const sentRows = input.versionRows.filter(
    (row) =>
      sentProposalStatuses.includes(row.version.status) &&
      isInPeriod(versionSentDate(row), input.period),
  );
  const viewedRows = input.versionRows.filter(
    (row) =>
      viewedProposalStatuses.includes(row.version.status) &&
      isInPeriod(versionViewedDate(row), input.period),
  );
  const acceptedRows = input.versionRows.filter(
    (row) =>
      row.version.status === "accepted" &&
      isInPeriod(versionAcceptedDate(row), input.period),
  );
  const realizedRows = input.appointmentRows.filter(
    (row) =>
      row.appointment.serviceStatus === "service_realized" &&
      isInPeriod(row.appointment.completedAt ?? row.appointment.updatedAt, input.period),
  );
  const periodReviewRows = input.reviewRows.filter((row) =>
    isInPeriod(row.createdAt, input.period),
  );

  return {
    requestsReceived: input.requestRows.length,
    requestsUnderReview: input.requestRows.filter((row) =>
      ["under_review", "awaiting_information"].includes(row.request.status),
    ).length,
    requestsDeclined: input.requestRows.filter(
      (row) => row.request.status === "declined_by_company",
    ).length,
    proposalsSent: sentRows.length,
    proposalsViewed: viewedRows.length,
    proposalsAccepted: acceptedRows.length,
    conversionRateBps: ratioBps(acceptedRows.length, sentRows.length),
    estimatedValueCents: input.requestRows.reduce(
      (total, row) => total + estimateValueCents(row),
      0,
    ),
    proposedValueCents: sentRows.reduce(
      (total, row) => total + (decimalMoneyToCents(row.version.finalTotal) ?? 0),
      0,
    ),
    acceptedValueCents: acceptedRows.reduce(
      (total, row) => total + (decimalMoneyToCents(row.version.finalTotal) ?? 0),
      0,
    ),
    averageResponseMinutes: averageResponseMinutes(sentRows),
    servicesRealized: realizedRows.length,
    reviewsCount: periodReviewRows.length,
    reviewAverage: averageRating(periodReviewRows),
  };
}

function estimateValueCents(row: QuoteRequestMetricRow) {
  const minimum = decimalMoneyToCents(row.request.estimateMin);
  const maximum = decimalMoneyToCents(row.request.estimateMax);

  if (minimum === null && maximum === null) {
    return 0;
  }

  if (minimum === null) {
    return maximum ?? 0;
  }

  if (maximum === null) {
    return minimum;
  }

  return Math.round((minimum + maximum) / 2);
}

function averageResponseMinutes(rows: QuoteVersionMetricRow[]) {
  const responseMinutes = rows
    .map((row) => {
      const submittedAt = row.requestSubmittedAt ?? row.requestCreatedAt;
      const sentAt = row.version.sentAt;

      if (!submittedAt || !sentAt) {
        return null;
      }

      const diff = sentAt.getTime() - submittedAt.getTime();
      return diff > 0 ? Math.round(diff / 60000) : null;
    })
    .filter((value): value is number => value !== null);

  if (responseMinutes.length === 0) {
    return null;
  }

  return Math.round(
    responseMinutes.reduce((total, value) => total + value, 0) / responseMinutes.length,
  );
}

function averageRating(rows: ReviewMetricRow[]) {
  if (rows.length === 0) {
    return null;
  }

  return (
    Math.round((rows.reduce((total, row) => total + row.rating, 0) / rows.length) * 10) /
    10
  );
}

function ratioBps(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator * 10000) / denominator);
}

function countCompanies(
  rows: Array<{ company: CompanyRow; profile: ProfileRow }>,
  status: CompanyRow["status"],
) {
  return rows.filter((row) => row.company.status === status).length;
}

function buildRequestsByCompany(
  requestRows: QuoteRequestMetricRow[],
  companyById: Map<string, MetricsCompanySummary>,
): AdminCompanyRequestMetric[] {
  const counts = new Map<string, number>();

  for (const row of requestRows) {
    counts.set(row.request.companyId, (counts.get(row.request.companyId) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([companyId, requestsReceived]) => ({
      company: companyById.get(companyId)!,
      requestsReceived,
    }))
    .filter((metric) => Boolean(metric.company))
    .sort((left, right) => right.requestsReceived - left.requestsReceived)
    .slice(0, 20);
}

function buildRequestsByNiche(
  companyRows: Array<{ company: CompanyRow; profile: ProfileRow }>,
  requestRows: QuoteRequestMetricRow[],
  versionRows: QuoteVersionMetricRow[],
  period: { start: Date | null; end: Date | null },
): AdminNicheMetric[] {
  const companyNiche = new Map(
    companyRows.map((row) => [
      row.company.id,
      toKnownCategoryCode(row.profile?.nicheCode ?? "cleaning_upholstery"),
    ]),
  );
  const metrics = new Map<PublicCompanyCategoryCode, AdminNicheMetric>();

  for (const nicheCode of new Set(companyNiche.values())) {
    metrics.set(nicheCode, emptyNicheMetric(nicheCode));
  }

  for (const row of requestRows) {
    const nicheCode = companyNiche.get(row.request.companyId) ?? "cleaning_upholstery";
    const metric = metrics.get(nicheCode) ?? emptyNicheMetric(nicheCode);
    metric.requestsReceived += 1;
    metrics.set(nicheCode, metric);
  }

  for (const row of versionRows) {
    const nicheCode = companyNiche.get(row.version.companyId) ?? "cleaning_upholstery";
    const metric = metrics.get(nicheCode) ?? emptyNicheMetric(nicheCode);

    if (
      sentProposalStatuses.includes(row.version.status) &&
      isInPeriod(versionSentDate(row), period)
    ) {
      metric.proposalsSent += 1;
    }

    if (
      row.version.status === "accepted" &&
      isInPeriod(versionAcceptedDate(row), period)
    ) {
      metric.proposalsAccepted += 1;
    }

    metrics.set(nicheCode, metric);
  }

  return Array.from(metrics.values())
    .map((metric) => ({
      ...metric,
      conversionRateBps: ratioBps(metric.proposalsAccepted, metric.proposalsSent),
    }))
    .sort((left, right) => right.requestsReceived - left.requestsReceived);
}

function emptyNicheMetric(nicheCode: PublicCompanyCategoryCode): AdminNicheMetric {
  return {
    nicheCode,
    nicheLabel: getCategoryLabel(nicheCode),
    requestsReceived: 0,
    proposalsSent: 0,
    proposalsAccepted: 0,
    conversionRateBps: 0,
  };
}

function buildCompanyRanking(input: {
  companyRows: Array<{ company: CompanyRow; profile: ProfileRow }>;
  requestRows: QuoteRequestMetricRow[];
  versionRows: QuoteVersionMetricRow[];
  period: { start: Date | null; end: Date | null };
}): AdminCompanyRankingMetric[] {
  const metrics = new Map<string, AdminCompanyRankingMetric>();

  for (const row of input.companyRows) {
    metrics.set(row.company.id, {
      company: mapCompany(row.company, row.profile),
      requestsReceived: 0,
      proposalsSent: 0,
      proposalsAccepted: 0,
      acceptedValueCents: 0,
      conversionRateBps: 0,
      averageResponseMinutes: null,
    });
  }

  for (const row of input.requestRows) {
    const metric = metrics.get(row.request.companyId);

    if (metric) {
      metric.requestsReceived += 1;
    }
  }

  const responseMinutesByCompany = new Map<string, number[]>();

  for (const row of input.versionRows) {
    const metric = metrics.get(row.version.companyId);

    if (!metric) {
      continue;
    }

    if (
      sentProposalStatuses.includes(row.version.status) &&
      isInPeriod(versionSentDate(row), input.period)
    ) {
      metric.proposalsSent += 1;
      const responseMinutes = averageResponseMinutes([row]);

      if (responseMinutes !== null) {
        const companyResponseMinutes =
          responseMinutesByCompany.get(row.version.companyId) ?? [];
        companyResponseMinutes.push(responseMinutes);
        responseMinutesByCompany.set(row.version.companyId, companyResponseMinutes);
      }
    }

    if (
      row.version.status === "accepted" &&
      isInPeriod(versionAcceptedDate(row), input.period)
    ) {
      metric.proposalsAccepted += 1;
      metric.acceptedValueCents += decimalMoneyToCents(row.version.finalTotal) ?? 0;
    }
  }

  for (const [companyId, values] of responseMinutesByCompany.entries()) {
    const metric = metrics.get(companyId);

    if (metric && values.length > 0) {
      metric.averageResponseMinutes = Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      );
    }
  }

  return Array.from(metrics.values())
    .map((metric) => ({
      ...metric,
      conversionRateBps: ratioBps(metric.proposalsAccepted, metric.proposalsSent),
    }))
    .filter(
      (metric) =>
        metric.requestsReceived > 0 ||
        metric.proposalsSent > 0 ||
        metric.proposalsAccepted > 0,
    )
    .sort(
      (left, right) =>
        right.acceptedValueCents - left.acceptedValueCents ||
        right.proposalsAccepted - left.proposalsAccepted ||
        right.requestsReceived - left.requestsReceived,
    )
    .slice(0, 10);
}

function summarizePriceChangeRequests(rows: PriceChangeMetricRow[]) {
  return {
    open: rows.filter((row) => row.status === "open").length,
    underReview: rows.filter((row) => row.status === "under_review").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    implemented: rows.filter((row) => row.status === "implemented").length,
  };
}

function mapAuditLog(
  row: Awaited<
    ReturnType<DrizzleOperationalMetricsRepository["selectAuditLogs"]>
  >[number],
  companyById: Map<string, MetricsCompanySummary>,
): OperationalAuditLogSummary {
  return {
    id: row.id,
    company: row.companyId ? (companyById.get(row.companyId) ?? null) : null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorName: row.actorName,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPriceChangeRequest(
  row: Awaited<
    ReturnType<DrizzleOperationalMetricsRepository["selectPriceChangeRequests"]>
  >[number],
): PriceChangeRequestSummary {
  return {
    id: row.priceChangeRequest.id,
    company: mapCompany(row.company, row.profile),
    serviceId: row.priceChangeRequest.serviceId,
    serviceName: row.serviceName,
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    status: row.priceChangeRequest.status,
    title: row.priceChangeRequest.title,
    description: row.priceChangeRequest.description,
    resolutionNote: row.priceChangeRequest.resolutionNote,
    resolvedByName: row.resolvedByName,
    resolvedAt: row.priceChangeRequest.resolvedAt?.toISOString() ?? null,
    createdAt: row.priceChangeRequest.createdAt.toISOString(),
    updatedAt: row.priceChangeRequest.updatedAt.toISOString(),
  };
}

async function insertAuditLog(
  tx: Transaction,
  input: {
    actorUserId: string;
    companyId: string;
    action: string;
    entityId: string;
    metadata: Record<string, unknown>;
  },
) {
  await tx.insert(auditLogs).values({
    id: randomUUID(),
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    action: input.action,
    entityType: "price_change_request",
    entityId: input.entityId,
    metadata: input.metadata,
  });
}

function decimalMoneyToCents(value: string | null) {
  if (value === null) {
    return null;
  }

  const [whole = "0", decimals = ""] = value.split(".");
  return Number(`${whole}${decimals.padEnd(2, "0").slice(0, 2)}`);
}
