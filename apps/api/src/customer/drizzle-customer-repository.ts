import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

import {
  appointments,
  companies,
  companyPublicProfiles,
  companyServices,
  customerFavoriteCompanies,
  notifications,
  quoteRequests,
  quotes,
  quoteVersions,
  reviews,
  templateServices,
  users,
} from "@velaris/database-schema";
import {
  quoteDraftDataSchema,
  type CustomerAppointmentSummary,
  type CustomerCompanySummary,
  type CustomerDashboardResponse,
  type CustomerNotificationSummary,
  type CustomerPendingReviewSummary,
  type CustomerProposalSummary,
  type CustomerQuoteRequestSummary,
  type QuoteVersionStatus,
} from "@velaris/shared";
import type { createDatabaseClient } from "../db/client.js";
import { getCategoryLabel, toKnownCategoryCode } from "../public/public-profile.js";
import type { CustomerAccount, CustomerRepository } from "./customer-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];
type UserRow = typeof users.$inferSelect;
type CompanyRow = typeof companies.$inferSelect;
type ProfileRow = typeof companyPublicProfiles.$inferSelect;
type RequestRow = {
  request: typeof quoteRequests.$inferSelect;
  company: CompanyRow;
  profile: ProfileRow;
  companyService: typeof companyServices.$inferSelect;
  templateService: typeof templateServices.$inferSelect;
};
type ProposalRow = {
  quote: typeof quotes.$inferSelect;
  version: typeof quoteVersions.$inferSelect;
  request: typeof quoteRequests.$inferSelect;
  company: CompanyRow;
  profile: ProfileRow;
};
type AppointmentRow = {
  appointment: typeof appointments.$inferSelect;
  request: typeof quoteRequests.$inferSelect;
  company: CompanyRow;
  profile: ProfileRow;
  companyService: typeof companyServices.$inferSelect;
  templateService: typeof templateServices.$inferSelect;
};
type NotificationRow = typeof notifications.$inferSelect;

const publicProposalStatuses: QuoteVersionStatus[] = [
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
];

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: Database) {}

  async findCustomerAccount(userId: string): Promise<CustomerAccount | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    return row ? mapCustomerAccount(row) : null;
  }

  async getDashboard(userId: string): Promise<CustomerDashboardResponse> {
    const [
      requestRows,
      proposalRows,
      appointmentRows,
      favoriteRows,
      pendingReviewRows,
      notificationRows,
    ] = await Promise.all([
      this.selectCustomerRequests(userId),
      this.selectCustomerProposals(userId),
      this.selectCustomerAppointments(userId),
      this.selectFavoriteCompanies(userId),
      this.selectPendingReviews(userId),
      this.selectNotifications(userId),
    ]);

    const requests = requestRows.map(mapRequestSummary);
    const proposals = mapProposalSummaries(proposalRows);
    const appointments = appointmentRows.map(mapAppointmentSummary);
    const favorites = favoriteRows.map((row) => mapCompany(row.company, row.profile));
    const pendingReviews = pendingReviewRows.map(mapPendingReview);

    return {
      linkedRequestsCount: requests.length,
      requests,
      proposals,
      appointments,
      history: requests,
      favorites,
      recentCompanies: getRecentCompanies(requestRows),
      pendingReviews,
      notifications: notificationRows.map(mapNotification),
    };
  }

  async linkVisitorRequests(input: {
    userId: string;
    email: string;
    phone: string | null;
    now: Date;
  }): Promise<number> {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone?.trim() ?? "";
    const contactConditions = [
      sql`lower(${quoteRequests.requestData}->'contact'->>'email') = ${email}`,
    ];

    if (phone) {
      contactConditions.push(
        sql`${quoteRequests.requestData}->'contact'->>'whatsapp' = ${phone}`,
      );
    }

    const linkedRows = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quoteRequests)
        .set({
          customerId: input.userId,
          updatedAt: input.now,
        })
        .where(
          and(
            isNull(quoteRequests.customerId),
            ne(quoteRequests.status, "draft"),
            or(...contactConditions),
          ),
        )
        .returning({
          id: quoteRequests.id,
          companyId: quoteRequests.companyId,
          requestCode: quoteRequests.requestCode,
        });

      if (rows.length > 0) {
        await tx.insert(notifications).values(
          rows.map((row) => ({
            id: randomUUID(),
            companyId: row.companyId,
            userId: input.userId,
            type: "visitor_request_linked",
            title: "Solicitacao vinculada",
            message: `A solicitacao ${row.requestCode ?? row.id} foi vinculada a sua conta.`,
            entityType: "quote_request",
            entityId: row.id,
            metadata: {
              source: "customer_area",
              requestCode: row.requestCode,
            },
            createdAt: input.now,
            updatedAt: input.now,
          })),
        );
      }

      return rows;
    });

    return linkedRows.length;
  }

  async addFavoriteCompany(input: {
    id: string;
    userId: string;
    companyId: string;
    now: Date;
  }): Promise<CustomerCompanySummary | null> {
    const company = await this.findCompany(input.companyId);

    if (!company) {
      return null;
    }

    await this.db
      .insert(customerFavoriteCompanies)
      .values({
        id: input.id,
        customerId: input.userId,
        companyId: input.companyId,
        createdAt: input.now,
      })
      .onConflictDoNothing();

    return mapCompany(company.company, company.profile);
  }

  async removeFavoriteCompany(input: {
    userId: string;
    companyId: string;
  }): Promise<void> {
    await this.db
      .delete(customerFavoriteCompanies)
      .where(
        and(
          eq(customerFavoriteCompanies.customerId, input.userId),
          eq(customerFavoriteCompanies.companyId, input.companyId),
        ),
      );
  }

  private async findCompany(companyId: string) {
    const [row] = await this.db
      .select({
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(companies)
      .innerJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .where(
        and(
          eq(companies.id, companyId),
          eq(companies.status, "active"),
          eq(companies.profileStatus, "published"),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  private selectCustomerRequests(userId: string) {
    return this.db
      .select({
        request: quoteRequests,
        company: companies,
        profile: companyPublicProfiles,
        companyService: companyServices,
        templateService: templateServices,
      })
      .from(quoteRequests)
      .innerJoin(companies, eq(companies.id, quoteRequests.companyId))
      .innerJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .innerJoin(companyServices, eq(companyServices.id, quoteRequests.companyServiceId))
      .innerJoin(
        templateServices,
        eq(templateServices.id, companyServices.templateServiceId),
      )
      .where(and(eq(quoteRequests.customerId, userId), ne(quoteRequests.status, "draft")))
      .orderBy(desc(quoteRequests.updatedAt));
  }

  private selectCustomerProposals(userId: string) {
    return this.db
      .select({
        quote: quotes,
        version: quoteVersions,
        request: quoteRequests,
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(quotes)
      .innerJoin(quoteRequests, eq(quoteRequests.id, quotes.quoteRequestId))
      .innerJoin(companies, eq(companies.id, quotes.companyId))
      .innerJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .innerJoin(quoteVersions, eq(quoteVersions.quoteId, quotes.id))
      .where(
        and(
          eq(quoteRequests.customerId, userId),
          inArray(quoteVersions.status, publicProposalStatuses),
        ),
      )
      .orderBy(desc(quoteVersions.versionNumber));
  }

  private selectCustomerAppointments(userId: string) {
    return this.db
      .select({
        appointment: appointments,
        request: quoteRequests,
        company: companies,
        profile: companyPublicProfiles,
        companyService: companyServices,
        templateService: templateServices,
      })
      .from(appointments)
      .innerJoin(quoteRequests, eq(quoteRequests.id, appointments.quoteRequestId))
      .innerJoin(companies, eq(companies.id, appointments.companyId))
      .innerJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .innerJoin(companyServices, eq(companyServices.id, quoteRequests.companyServiceId))
      .innerJoin(
        templateServices,
        eq(templateServices.id, companyServices.templateServiceId),
      )
      .where(eq(quoteRequests.customerId, userId))
      .orderBy(desc(appointments.startsAt));
  }

  private selectFavoriteCompanies(userId: string) {
    return this.db
      .select({
        company: companies,
        profile: companyPublicProfiles,
      })
      .from(customerFavoriteCompanies)
      .innerJoin(companies, eq(companies.id, customerFavoriteCompanies.companyId))
      .innerJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .where(
        and(
          eq(customerFavoriteCompanies.customerId, userId),
          eq(companies.status, "active"),
          eq(companies.profileStatus, "published"),
        ),
      )
      .orderBy(desc(customerFavoriteCompanies.createdAt));
  }

  private selectPendingReviews(userId: string) {
    return this.db
      .select({
        appointment: appointments,
        request: quoteRequests,
        quote: quotes,
        version: quoteVersions,
        company: companies,
        profile: companyPublicProfiles,
        companyService: companyServices,
        templateService: templateServices,
      })
      .from(appointments)
      .innerJoin(quoteRequests, eq(quoteRequests.id, appointments.quoteRequestId))
      .innerJoin(quotes, eq(quotes.id, appointments.quoteId))
      .innerJoin(quoteVersions, eq(quoteVersions.id, appointments.quoteVersionId))
      .innerJoin(companies, eq(companies.id, appointments.companyId))
      .innerJoin(companyPublicProfiles, eq(companyPublicProfiles.companyId, companies.id))
      .innerJoin(companyServices, eq(companyServices.id, quoteRequests.companyServiceId))
      .innerJoin(
        templateServices,
        eq(templateServices.id, companyServices.templateServiceId),
      )
      .leftJoin(reviews, eq(reviews.appointmentId, appointments.id))
      .where(
        and(
          eq(quoteRequests.customerId, userId),
          eq(appointments.status, "completed"),
          eq(appointments.serviceStatus, "service_realized"),
          or(
            eq(quoteVersions.status, "accepted"),
            eq(quotes.acceptedQuoteVersionId, appointments.quoteVersionId),
          ),
          isNull(reviews.id),
        ),
      )
      .orderBy(desc(appointments.updatedAt));
  }

  private selectNotifications(userId: string) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
  }
}

function mapCustomerAccount(row: UserRow): CustomerAccount {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    isEmailVerified: row.isEmailVerified,
    role: row.role,
  };
}

function mapRequestSummary(row: RequestRow): CustomerQuoteRequestSummary {
  const data = quoteDraftDataSchema.parse(row.request.requestData);

  return {
    id: row.request.id,
    requestCode: row.request.requestCode ?? row.request.id,
    status: row.request.status,
    company: mapCompany(row.company, row.profile),
    serviceName: row.templateService.name,
    itemCount: data.items.length,
    estimateMinCents: decimalMoneyToCents(row.request.estimateMin),
    estimateMaxCents: decimalMoneyToCents(row.request.estimateMax),
    submittedAt:
      row.request.submittedAt?.toISOString() ?? row.request.createdAt.toISOString(),
    updatedAt: row.request.updatedAt.toISOString(),
  };
}

function mapProposalSummaries(rows: ProposalRow[]): CustomerProposalSummary[] {
  const grouped = new Map<
    string,
    {
      quote: ProposalRow["quote"];
      versions: ProposalRow["version"][];
      request: ProposalRow["request"];
      company: CompanyRow;
      profile: ProfileRow;
    }
  >();

  for (const row of rows) {
    const existing = grouped.get(row.quote.id);

    if (existing) {
      existing.versions.push(row.version);
      continue;
    }

    grouped.set(row.quote.id, {
      quote: row.quote,
      versions: [row.version],
      request: row.request,
      company: row.company,
      profile: row.profile,
    });
  }

  return Array.from(grouped.values()).map(
    ({ quote, versions, request, company, profile }) => {
      const latestVersion = versions
        .slice()
        .sort((left, right) => right.versionNumber - left.versionNumber)[0]!;

      return {
        id: quote.id,
        quoteRequestId: quote.quoteRequestId,
        requestCode: request.requestCode ?? request.id,
        company: mapCompany(company, profile),
        status: quote.status,
        latestProposalCode: latestVersion.proposalCode,
        latestVersionStatus: latestVersion.status,
        finalTotalCents: decimalMoneyToCents(latestVersion.finalTotal),
        validUntil: latestVersion.validUntil.toISOString(),
        sentAt: latestVersion.sentAt?.toISOString() ?? null,
        updatedAt: quote.updatedAt.toISOString(),
      };
    },
  );
}

function mapAppointmentSummary(row: AppointmentRow): CustomerAppointmentSummary {
  return {
    id: row.appointment.id,
    quoteRequestId: row.appointment.quoteRequestId,
    requestCode: row.request.requestCode ?? row.request.id,
    company: mapCompany(row.company, row.profile),
    serviceName: row.templateService.name,
    status: row.appointment.status,
    serviceStatus: row.appointment.serviceStatus,
    startsAt: row.appointment.startsAt.toISOString(),
    endsAt: row.appointment.endsAt?.toISOString() ?? null,
    durationMinutes: row.appointment.durationMinutes,
    timezone: row.appointment.timezone,
    address: row.appointment.address,
    updatedAt: row.appointment.updatedAt.toISOString(),
  };
}

function mapPendingReview(
  row: Awaited<ReturnType<DrizzleCustomerRepository["selectPendingReviews"]>>[number],
): CustomerPendingReviewSummary {
  return {
    appointmentId: row.appointment.id,
    quoteRequestId: row.request.id,
    requestCode: row.request.requestCode ?? row.request.id,
    proposalCode: row.version.proposalCode,
    company: mapCompany(row.company, row.profile),
    serviceName: row.templateService.name,
    completedAt: row.appointment.completedAt?.toISOString() ?? null,
  };
}

function mapNotification(row: NotificationRow): CustomerNotificationSummary {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function getRecentCompanies(rows: RequestRow[]) {
  const companiesById = new Map<string, CustomerCompanySummary>();

  for (const row of rows) {
    if (!companiesById.has(row.company.id)) {
      companiesById.set(row.company.id, mapCompany(row.company, row.profile));
    }
  }

  return Array.from(companiesById.values()).slice(0, 8);
}

function mapCompany(company: CompanyRow, profile: ProfileRow): CustomerCompanySummary {
  const nicheCode = toKnownCategoryCode(profile.nicheCode);

  return {
    id: company.id,
    tradingName: company.tradingName,
    slug: company.slug,
    nicheCode,
    nicheLabel: getCategoryLabel(nicheCode),
    city: profile.city,
    state: profile.state,
    logoUrl: profile.logoUrl,
    reviewSummary: {
      average: profile.reviewAverage ? Number(profile.reviewAverage) : null,
      count: profile.reviewCount,
    },
  };
}

function decimalMoneyToCents(value: string | null) {
  if (value === null) {
    return null;
  }

  const [whole = "0", decimals = ""] = value.split(".");
  return Number(`${whole}${decimals.padEnd(2, "0").slice(0, 2)}`);
}
