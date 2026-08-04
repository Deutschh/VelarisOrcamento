import type {
  AdminAuditLogQuery,
  AdminMetricsQuery,
  AdminOperationalMetricsResponse,
  AdminPriceChangeRequestListQuery,
  CompanyOperationalMetricsResponse,
  MetricsPeriodQuery,
  MetricsCompanySummary,
  MetricsPeriodSummary,
  OperationalAuditLogSummary,
  OperationalMetricsTotals,
  PriceChangeRequestSummary,
} from "@velaris/shared";

import type {
  CreatePriceChangeRequestInput,
  OperationalMetricsRepository,
  ResolvePriceChangeRequestInput,
} from "../operational/operational-metrics-repository.js";

const emptyPeriod: MetricsPeriodSummary = {
  periodStart: null,
  periodEnd: null,
};

const emptyTotals: OperationalMetricsTotals = {
  requestsReceived: 0,
  requestsUnderReview: 0,
  requestsDeclined: 0,
  proposalsSent: 0,
  proposalsViewed: 0,
  proposalsAccepted: 0,
  conversionRateBps: 0,
  estimatedValueCents: 0,
  proposedValueCents: 0,
  acceptedValueCents: 0,
  averageResponseMinutes: null,
  servicesRealized: 0,
  reviewsCount: 0,
  reviewAverage: null,
};

export const operationalTestCompany: MetricsCompanySummary = {
  id: "20000000-0000-4000-8000-000000000001",
  tradingName: "Limpa Sofa",
  slug: "limpa-sofa",
  nicheCode: "cleaning_upholstery",
  nicheLabel: "Limpeza de estofados",
};

export class InMemoryOperationalMetricsRepository implements OperationalMetricsRepository {
  readonly createdPriceChangeRequests: CreatePriceChangeRequestInput[] = [];
  readonly resolvedPriceChangeRequests: ResolvePriceChangeRequestInput[] = [];
  readonly companyMetricQueries: Array<{ companyId: string }> = [];
  readonly adminMetricQueries: AdminMetricsQuery[] = [];
  readonly auditQueries: AdminAuditLogQuery[] = [];
  readonly adminPriceChangeQueries: AdminPriceChangeRequestListQuery[] = [];
  priceChangeRequests: PriceChangeRequestSummary[] = [];
  auditLogs: OperationalAuditLogSummary[] = [];
  companyMetrics: CompanyOperationalMetricsResponse = {
    period: emptyPeriod,
    totals: emptyTotals,
    priceChangeRequests: [],
    recentAuditLogs: [],
  };
  adminMetrics: AdminOperationalMetricsResponse = {
    period: emptyPeriod,
    companies: {
      pending: 0,
      active: 0,
      suspended: 0,
    },
    totals: emptyTotals,
    requestsByCompany: [],
    requestsByNiche: [],
    conversionByNiche: [],
    ranking: [],
    storageUsageBytes: 0,
    priceChangeRequests: {
      open: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      implemented: 0,
    },
  };

  async getCompanyMetrics(input: {
    companyId: string;
    query: MetricsPeriodQuery;
  }): Promise<CompanyOperationalMetricsResponse> {
    this.companyMetricQueries.push(input);
    return {
      ...this.companyMetrics,
      priceChangeRequests: this.priceChangeRequests,
      recentAuditLogs: this.auditLogs,
    };
  }

  async getAdminMetrics(
    query: AdminMetricsQuery,
  ): Promise<AdminOperationalMetricsResponse> {
    this.adminMetricQueries.push(query);
    return this.adminMetrics;
  }

  async listAdminAuditLogs(
    query: AdminAuditLogQuery,
  ): Promise<OperationalAuditLogSummary[]> {
    this.auditQueries.push(query);
    return this.auditLogs;
  }

  async listCompanyPriceChangeRequests(
    _companyId: string,
  ): Promise<PriceChangeRequestSummary[]> {
    return this.priceChangeRequests;
  }

  async createPriceChangeRequest(
    input: CreatePriceChangeRequestInput,
  ): Promise<PriceChangeRequestSummary | null> {
    this.createdPriceChangeRequests.push(input);

    const request: PriceChangeRequestSummary = {
      id: input.id,
      company: operationalTestCompany,
      serviceId: input.input.serviceId ?? null,
      serviceName: null,
      requestedByName: null,
      requestedByEmail: null,
      status: "open",
      title: input.input.title,
      description: input.input.description,
      resolutionNote: null,
      resolvedByName: null,
      resolvedAt: null,
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };
    this.priceChangeRequests.push(request);
    return request;
  }

  async listAdminPriceChangeRequests(
    query: AdminPriceChangeRequestListQuery,
  ): Promise<PriceChangeRequestSummary[]> {
    this.adminPriceChangeQueries.push(query);
    return this.priceChangeRequests;
  }

  async resolvePriceChangeRequest(
    input: ResolvePriceChangeRequestInput,
  ): Promise<PriceChangeRequestSummary | null> {
    this.resolvedPriceChangeRequests.push(input);
    const current = this.priceChangeRequests.find(
      (request) => request.id === input.requestId,
    );

    if (!current) {
      return null;
    }

    current.status = input.input.status;
    current.resolutionNote = input.input.resolutionNote ?? null;
    current.resolvedAt =
      input.input.status === "under_review" ? null : input.now.toISOString();
    current.updatedAt = input.now.toISOString();
    return current;
  }
}
