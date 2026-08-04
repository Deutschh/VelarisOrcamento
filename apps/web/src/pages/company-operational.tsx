import {
  companyPriceChangeRequestCreateSchema,
  type CompanyOperationalMetricsResponse,
  type CompanyPriceChangeRequestCreateResponse,
  type PriceChangeRequestStatus,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, ClipboardList, FileText, Send } from "lucide-react";
import { useState } from "react";

import {
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  SubmitButton,
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

export function CompanyOperationalPanel() {
  const queryClient = useQueryClient();
  const [periodStart, setPeriodStart] = useState(
    formatDateTimeLocalInput(addDaysToDate(new Date(), -30)),
  );
  const [periodEnd, setPeriodEnd] = useState(formatDateTimeLocalInput(new Date()));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const metricsQuery = useQuery({
    queryKey: ["company-operational-metrics", periodStart, periodEnd],
    queryFn: () =>
      apiRequest<CompanyOperationalMetricsResponse>(
        `/api/company/metrics${buildPeriodSearch(periodStart, periodEnd)}`,
      ),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<CompanyPriceChangeRequestCreateResponse>(
        "/api/company/price-change-requests",
        {
          method: "POST",
          body: JSON.stringify(
            companyPriceChangeRequestCreateSchema.parse({
              title,
              description,
            }),
          ),
        },
      ),
    async onSuccess() {
      setTitle("");
      setDescription("");
      await queryClient.invalidateQueries({
        queryKey: ["company-operational-metrics"],
      });
    },
  });
  const metrics = metricsQuery.data;
  const createError = createMutation.error
    ? errorMessage(createMutation.error, "Nao foi possivel registrar a solicitacao.")
    : null;

  return (
    <section className="mt-6 space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <BarChart3 size={20} />
              Desempenho operacional
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Indicadores calculados a partir das solicitacoes, propostas, agendamentos e
              avaliacoes.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
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
          </div>
        </div>
        {metricsQuery.isLoading ? <LoadingLine /> : null}
        {metricsQuery.error ? (
          <ErrorPanel
            error={metricsQuery.error}
            fallback="Nao foi possivel carregar as metricas."
          />
        ) : null}
        {metrics ? <CompanyMetricsGrid metrics={metrics} /> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList size={18} />
            Solicitacoes de alteracao de preco
          </h2>
          <div className="mt-4 divide-y divide-white/10 rounded-md border border-white/10">
            {metrics?.priceChangeRequests.length ? (
              metrics.priceChangeRequests.map((request) => (
                <div className="px-3 py-3" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white/85">{request.title}</p>
                      <p className="mt-1 text-xs text-white/45">
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
                </div>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-white/50">
                Nenhuma solicitacao registrada.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText size={18} />
            Pedir revisao comercial
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <TextField
              label="Titulo"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextAreaField
              label="Descricao"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <SubmitButton icon={Send} isLoading={createMutation.isPending}>
              Enviar solicitacao
            </SubmitButton>
            <FormError message={createError} />
          </form>
        </section>
      </div>

      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-semibold">Auditoria recente</h2>
        <Timeline
          empty="Nenhuma acao operacional registrada no periodo."
          items={(metrics?.recentAuditLogs ?? []).map((auditLog) => ({
            id: auditLog.id,
            title: auditLog.action,
            detail: auditLog.actorName ?? "Sistema",
            date: auditLog.createdAt,
          }))}
        />
      </section>
    </section>
  );
}

function CompanyMetricsGrid({ metrics }: { metrics: CompanyOperationalMetricsResponse }) {
  const totals = metrics.totals;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <InfoBlock label="Solicitacoes" value={String(totals.requestsReceived)} />
      <InfoBlock label="Em analise" value={String(totals.requestsUnderReview)} />
      <InfoBlock label="Recusadas" value={String(totals.requestsDeclined)} />
      <InfoBlock label="Conversao" value={formatPercentBps(totals.conversionRateBps)} />
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
        label="Tempo medio"
        value={
          totals.averageResponseMinutes === null
            ? "Sem historico"
            : formatDurationMinutes(totals.averageResponseMinutes)
        }
      />
      <InfoBlock label="Propostas enviadas" value={String(totals.proposalsSent)} />
      <InfoBlock label="Propostas visualizadas" value={String(totals.proposalsViewed)} />
      <InfoBlock label="Propostas aceitas" value={String(totals.proposalsAccepted)} />
      <InfoBlock
        label="Avaliacoes"
        value={
          totals.reviewAverage === null
            ? String(totals.reviewsCount)
            : `${totals.reviewsCount} - nota ${totals.reviewAverage.toFixed(1)}`
        }
      />
    </div>
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

function buildPeriodSearch(periodStart: string, periodEnd: string) {
  const search = new URLSearchParams();
  const startIso = parseDateTimeLocalInputToIso(periodStart);
  const endIso = parseDateTimeLocalInputToIso(periodEnd);

  if (startIso) {
    search.set("periodStart", startIso);
  }

  if (endIso) {
    search.set("periodEnd", endIso);
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}
