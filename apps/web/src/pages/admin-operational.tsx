import {
  PUBLIC_COMPANY_CATEGORIES,
  adminPriceChangeRequestResolveSchema,
  type AdminAuditLogListResponse,
  type AdminCompanySummary,
  type AdminOperationalMetricsResponse,
  type AdminPriceChangeRequestListResponse,
  type AdminPriceChangeRequestResolveResponse,
  type PriceChangeRequestStatus,
  type PublicCompanyCategoryCode,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Clock3, ListChecks, Save, XCircle } from "lucide-react";
import { useState } from "react";

import { SelectField } from "../components/form-controls.js";
import {
  ActionButton,
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  TextAreaField,
  TextField,
  Timeline,
} from "../components/ui.js";
import { apiRequest, errorMessage } from "../lib/api.js";
import {
  addDaysToDate,
  formatDate,
  formatDateTimeLocalInput,
  formatDurationMinutes,
  formatFileSize,
  formatMoneyCents,
  formatPercentBps,
  parseDateTimeLocalInputToIso,
} from "../lib/formatters.js";

const priceChangeStatusLabels: Record<PriceChangeRequestStatus, string> = {
  open: "Aberta",
  under_review: "Em analise",
  approved: "Aprovada",
  rejected: "Rejeitada",
  implemented: "Implementada",
};

export function AdminOperationalPanel({
  companies,
}: {
  companies: AdminCompanySummary[];
}) {
  const queryClient = useQueryClient();
  const [periodStart, setPeriodStart] = useState(
    formatDateTimeLocalInput(addDaysToDate(new Date(), -30)),
  );
  const [periodEnd, setPeriodEnd] = useState(formatDateTimeLocalInput(new Date()));
  const [nicheCode, setNicheCode] = useState<PublicCompanyCategoryCode | "all">("all");
  const [companyId, setCompanyId] = useState("all");
  const [priceStatus, setPriceStatus] = useState<PriceChangeRequestStatus | "all">("all");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const metricsSearch = buildAdminSearch({
    periodStart,
    periodEnd,
    nicheCode,
    companyId,
  });
  const priceSearch = buildPriceRequestSearch({ companyId, priceStatus });
  const metricsQuery = useQuery({
    queryKey: ["admin-operational-metrics", periodStart, periodEnd, nicheCode, companyId],
    queryFn: () =>
      apiRequest<AdminOperationalMetricsResponse>(`/api/admin/metrics${metricsSearch}`),
  });
  const auditQuery = useQuery({
    queryKey: ["admin-operational-audit", periodStart, periodEnd, companyId],
    queryFn: () =>
      apiRequest<AdminAuditLogListResponse>(
        `/api/admin/audit${buildAuditSearch({ periodStart, periodEnd, companyId })}`,
      ),
  });
  const priceRequestsQuery = useQuery({
    queryKey: ["admin-price-change-requests", companyId, priceStatus],
    queryFn: () =>
      apiRequest<AdminPriceChangeRequestListResponse>(
        `/api/admin/price-change-requests${priceSearch}`,
      ),
  });
  const resolveMutation = useMutation({
    mutationFn: (input: {
      id: string;
      status: Exclude<PriceChangeRequestStatus, "open">;
    }) =>
      apiRequest<AdminPriceChangeRequestResolveResponse>(
        `/api/admin/price-change-requests/${input.id}/resolve`,
        {
          method: "POST",
          body: JSON.stringify(
            adminPriceChangeRequestResolveSchema.parse({
              status: input.status,
              resolutionNote: resolutionNotes[input.id]?.trim() || undefined,
            }),
          ),
        },
      ),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-operational-metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-operational-audit"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-price-change-requests"] }),
      ]);
    },
  });
  const resolveError = resolveMutation.error
    ? errorMessage(resolveMutation.error, "Nao foi possivel atualizar a solicitacao.")
    : null;
  const metrics = metricsQuery.data;

  return (
    <section className="mt-6 space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <BarChart3 size={20} />
              Operacao da plataforma
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Visao consolidada por periodo, nicho e empresa.
            </p>
          </div>
          <div className="grid w-full gap-3 md:grid-cols-2 xl:w-auto xl:grid-cols-4">
            <TextField
              label="Inicio"
              type="datetime-local"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
            <TextField
              label="Fim"
              type="datetime-local"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
            <SelectField
              label="Nicho"
              options={[
                ["all", "Todos"],
                ...PUBLIC_COMPANY_CATEGORIES.map((category): [string, string] => [
                  category.code,
                  category.label,
                ]),
              ]}
              value={nicheCode}
              onChange={(value) =>
                setNicheCode(value as PublicCompanyCategoryCode | "all")
              }
            />
            <SelectField
              label="Empresa"
              options={[
                ["all", "Todas"],
                ...companies.map((company): [string, string] => [
                  company.id,
                  company.tradingName,
                ]),
              ]}
              value={companyId}
              onChange={setCompanyId}
            />
          </div>
        </div>
        {metricsQuery.isLoading ? <LoadingLine /> : null}
        {metricsQuery.error ? (
          <ErrorPanel
            error={metricsQuery.error}
            fallback="Nao foi possivel carregar metricas operacionais."
          />
        ) : null}
        {metrics ? <AdminMetricsGrid metrics={metrics} /> : null}
      </section>

      {metrics ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminNicheTable metrics={metrics} />
          <AdminRankingTable metrics={metrics} />
        </div>
      ) : null}

      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks size={18} />
              Mudancas de preco
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Pedidos feitos pelas empresas para revisao comercial.
            </p>
          </div>
          <SelectField
            label="Status"
            options={[["all", "Todos"], ...Object.entries(priceChangeStatusLabels)]}
            value={priceStatus}
            onChange={(value) =>
              setPriceStatus(value as PriceChangeRequestStatus | "all")
            }
          />
        </div>
        <FormError message={resolveError} />
        {priceRequestsQuery.isLoading ? <LoadingLine /> : null}
        {priceRequestsQuery.error ? (
          <ErrorPanel
            error={priceRequestsQuery.error}
            fallback="Nao foi possivel carregar pedidos de preco."
          />
        ) : null}
        <div className="mt-4 space-y-3">
          {(priceRequestsQuery.data?.priceChangeRequests ?? []).map((request) => (
            <div
              className="rounded-md border border-white/10 bg-white/[0.03] p-4"
              key={request.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white/85">{request.title}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {request.company.tradingName} -{" "}
                    {request.serviceName ?? "Servico geral"} -{" "}
                    {formatDate(request.createdAt)}
                  </p>
                </div>
                <PriceChangeStatusPill status={request.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {request.description}
              </p>
              {request.resolutionNote ? (
                <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/65">
                  {request.resolutionNote}
                </p>
              ) : null}
              <TextAreaField
                className="mt-4"
                label="Nota de resolucao"
                rows={2}
                value={resolutionNotes[request.id] ?? ""}
                onChange={(event) =>
                  setResolutionNotes((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))
                }
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton
                  disabled={request.status === "under_review"}
                  icon={Clock3}
                  isLoading={resolveMutation.isPending}
                  variant="secondary"
                  onClick={() =>
                    resolveMutation.mutate({
                      id: request.id,
                      status: "under_review",
                    })
                  }
                >
                  Analisar
                </ActionButton>
                <ActionButton
                  icon={CheckCircle2}
                  isLoading={resolveMutation.isPending}
                  onClick={() =>
                    resolveMutation.mutate({ id: request.id, status: "approved" })
                  }
                >
                  Aprovar
                </ActionButton>
                <ActionButton
                  icon={Save}
                  isLoading={resolveMutation.isPending}
                  variant="secondary"
                  onClick={() =>
                    resolveMutation.mutate({ id: request.id, status: "implemented" })
                  }
                >
                  Implementada
                </ActionButton>
                <ActionButton
                  icon={XCircle}
                  isLoading={resolveMutation.isPending}
                  variant="warning"
                  onClick={() =>
                    resolveMutation.mutate({ id: request.id, status: "rejected" })
                  }
                >
                  Rejeitar
                </ActionButton>
              </div>
            </div>
          ))}
          {priceRequestsQuery.data?.priceChangeRequests.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
              Nenhum pedido de preco neste filtro.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-semibold">Auditoria operacional</h2>
        {auditQuery.isLoading ? <LoadingLine /> : null}
        {auditQuery.error ? (
          <ErrorPanel
            error={auditQuery.error}
            fallback="Nao foi possivel carregar auditoria."
          />
        ) : null}
        <Timeline
          empty="Nenhuma acao auditavel registrada neste periodo."
          items={(auditQuery.data?.auditLogs ?? []).map((auditLog) => ({
            id: auditLog.id,
            title: auditLog.action,
            detail: auditLog.company
              ? `${auditLog.company.tradingName} - ${auditLog.actorName ?? "Sistema"}`
              : (auditLog.actorName ?? "Sistema"),
            date: auditLog.createdAt,
          }))}
        />
      </section>
    </section>
  );
}

function AdminMetricsGrid({ metrics }: { metrics: AdminOperationalMetricsResponse }) {
  const totals = metrics.totals;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <InfoBlock label="Empresas pendentes" value={String(metrics.companies.pending)} />
      <InfoBlock label="Empresas ativas" value={String(metrics.companies.active)} />
      <InfoBlock label="Empresas suspensas" value={String(metrics.companies.suspended)} />
      <InfoBlock label="Conversao" value={formatPercentBps(totals.conversionRateBps)} />
      <InfoBlock label="Solicitacoes" value={String(totals.requestsReceived)} />
      <InfoBlock label="Propostas enviadas" value={String(totals.proposalsSent)} />
      <InfoBlock label="Propostas aceitas" value={String(totals.proposalsAccepted)} />
      <InfoBlock
        label="Tempo medio"
        value={
          totals.averageResponseMinutes === null
            ? "Sem historico"
            : formatDurationMinutes(totals.averageResponseMinutes)
        }
      />
      <InfoBlock
        label="Valor estimado"
        value={formatMoneyCents(totals.estimatedValueCents)}
      />
      <InfoBlock
        label="Valor proposto"
        value={formatMoneyCents(totals.proposedValueCents)}
      />
      <InfoBlock
        label="Valor aceito"
        value={formatMoneyCents(totals.acceptedValueCents)}
      />
      <InfoBlock
        label="Armazenamento"
        value={formatFileSize(metrics.storageUsageBytes)}
      />
    </div>
  );
}

function AdminNicheTable({ metrics }: { metrics: AdminOperationalMetricsResponse }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-lg font-semibold">Por nicho</h2>
      </div>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-white/[0.05] text-white/60">
          <tr>
            <th className="px-4 py-3 font-medium">Nicho</th>
            <th className="px-4 py-3 font-medium">Solicitacoes</th>
            <th className="px-4 py-3 font-medium">Enviadas</th>
            <th className="px-4 py-3 font-medium">Aceitas</th>
            <th className="px-4 py-3 font-medium">Conversao</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {metrics.requestsByNiche.map((metric) => (
            <tr className="bg-white/[0.02]" key={metric.nicheCode}>
              <td className="px-4 py-3 font-medium">{metric.nicheLabel}</td>
              <td className="px-4 py-3 text-white/70">{metric.requestsReceived}</td>
              <td className="px-4 py-3 text-white/70">{metric.proposalsSent}</td>
              <td className="px-4 py-3 text-white/70">{metric.proposalsAccepted}</td>
              <td className="px-4 py-3 text-white/70">
                {formatPercentBps(metric.conversionRateBps)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AdminRankingTable({ metrics }: { metrics: AdminOperationalMetricsResponse }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-lg font-semibold">Ranking</h2>
      </div>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.05] text-white/60">
          <tr>
            <th className="px-4 py-3 font-medium">Empresa</th>
            <th className="px-4 py-3 font-medium">Aceitas</th>
            <th className="px-4 py-3 font-medium">Valor aceito</th>
            <th className="px-4 py-3 font-medium">Conversao</th>
            <th className="px-4 py-3 font-medium">Resposta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {metrics.ranking.map((metric) => (
            <tr className="bg-white/[0.02]" key={metric.company.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{metric.company.tradingName}</div>
                <div className="text-xs text-white/45">{metric.company.nicheLabel}</div>
              </td>
              <td className="px-4 py-3 text-white/70">{metric.proposalsAccepted}</td>
              <td className="px-4 py-3 text-white/70">
                {formatMoneyCents(metric.acceptedValueCents)}
              </td>
              <td className="px-4 py-3 text-white/70">
                {formatPercentBps(metric.conversionRateBps)}
              </td>
              <td className="px-4 py-3 text-white/70">
                {metric.averageResponseMinutes === null
                  ? "Sem historico"
                  : formatDurationMinutes(metric.averageResponseMinutes)}
              </td>
            </tr>
          ))}
          {metrics.ranking.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-sm text-white/50" colSpan={5}>
                Sem dados suficientes para ranking.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function PriceChangeStatusPill({ status }: { status: PriceChangeRequestStatus }) {
  const classes: Record<PriceChangeRequestStatus, string> = {
    open: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    under_review: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    approved: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    rejected: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    implemented: "border-white/15 bg-white/[0.04] text-white/65",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${classes[status]}`}
    >
      {priceChangeStatusLabels[status]}
    </span>
  );
}

function buildAdminSearch(input: {
  periodStart: string;
  periodEnd: string;
  nicheCode: PublicCompanyCategoryCode | "all";
  companyId: string;
}) {
  const search = new URLSearchParams();
  const startIso = parseDateTimeLocalInputToIso(input.periodStart);
  const endIso = parseDateTimeLocalInputToIso(input.periodEnd);

  if (startIso) {
    search.set("periodStart", startIso);
  }

  if (endIso) {
    search.set("periodEnd", endIso);
  }

  if (input.nicheCode !== "all") {
    search.set("nicheCode", input.nicheCode);
  }

  if (input.companyId !== "all") {
    search.set("companyId", input.companyId);
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}

function buildAuditSearch(input: {
  periodStart: string;
  periodEnd: string;
  companyId: string;
}) {
  const search = new URLSearchParams();
  const startIso = parseDateTimeLocalInputToIso(input.periodStart);
  const endIso = parseDateTimeLocalInputToIso(input.periodEnd);

  if (startIso) {
    search.set("periodStart", startIso);
  }

  if (endIso) {
    search.set("periodEnd", endIso);
  }

  if (input.companyId !== "all") {
    search.set("companyId", input.companyId);
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}

function buildPriceRequestSearch(input: {
  companyId: string;
  priceStatus: PriceChangeRequestStatus | "all";
}) {
  const search = new URLSearchParams();

  if (input.companyId !== "all") {
    search.set("companyId", input.companyId);
  }

  if (input.priceStatus !== "all") {
    search.set("status", input.priceStatus);
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}
