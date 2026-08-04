import type {
  AdminAuditLogQuery,
  AdminMetricsQuery,
  AdminOperationalMetricsResponse,
  AdminPriceChangeRequestListQuery,
  AdminPriceChangeRequestResolve,
  CompanyOperationalMetricsResponse,
  CompanyPriceChangeRequestCreate,
  MetricsPeriodQuery,
  OperationalAuditLogSummary,
  PriceChangeRequestSummary,
} from "@velaris/shared";

export interface CreatePriceChangeRequestInput {
  id: string;
  companyId: string;
  actorUserId: string;
  input: CompanyPriceChangeRequestCreate;
  now: Date;
}

export interface ResolvePriceChangeRequestInput {
  requestId: string;
  actorUserId: string;
  input: AdminPriceChangeRequestResolve;
  now: Date;
}

export interface OperationalMetricsRepository {
  getCompanyMetrics(input: {
    companyId: string;
    query: MetricsPeriodQuery;
  }): Promise<CompanyOperationalMetricsResponse>;
  getAdminMetrics(query: AdminMetricsQuery): Promise<AdminOperationalMetricsResponse>;
  listAdminAuditLogs(query: AdminAuditLogQuery): Promise<OperationalAuditLogSummary[]>;
  listCompanyPriceChangeRequests(companyId: string): Promise<PriceChangeRequestSummary[]>;
  createPriceChangeRequest(
    input: CreatePriceChangeRequestInput,
  ): Promise<PriceChangeRequestSummary | null>;
  listAdminPriceChangeRequests(
    query: AdminPriceChangeRequestListQuery,
  ): Promise<PriceChangeRequestSummary[]>;
  resolvePriceChangeRequest(
    input: ResolvePriceChangeRequestInput,
  ): Promise<PriceChangeRequestSummary | null>;
}
