import {
  companyCreateProposalRequestSchema,
  companyProposeAppointmentRequestSchema,
  companyQuoteRequestDeclineRequestSchema,
  companyQuoteRequestReviewRequestSchema,
  companyUpdateAppointmentRequestSchema,
} from "@velaris/shared";
import type {
  CompanyAccountStatus,
  CompanyAppointmentConflict,
  CompanyAppointmentResponse,
  CompanyProposalDetailResponse,
  CompanyQuoteDashboard,
  CompanyQuoteRequestDetail,
  CompanyQuoteRequestDetailResponse,
  CompanyQuoteRequestSummary,
  CompanyQuoteRequestsListResponse,
  QuoteDraftData,
  QuoteDraftItem,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  PlusCircle,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";

import { CheckboxField, SelectField } from "../components/form-controls.js";
import {
  ActionButton,
  AppShell,
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  SectionTitle,
  TextAreaField,
  TextField,
  Timeline,
} from "../components/ui.js";
import {
  AppointmentStatusBadge,
  ProfileBadge,
  ProposalVersionStatusBadge,
  QuoteRequestStatusBadge,
  StatusBadge,
  appointmentStatusLabels,
  quoteRequestStatusLabels,
} from "../components/status-badges.js";
import { apiRequest, errorMessage } from "../lib/api.js";
import {
  addDaysToDate,
  formatAppointmentWindow,
  formatDate,
  formatDateTimeLocalInput,
  formatDurationMinutes,
  formatFileSize,
  formatMoneyCents,
  formatMoneyInputFromCents,
  formatQuoteAddress,
  getLatestAppointment,
  getLatestProposalSummary,
  hasRequiredAppointmentForProposal,
  parseDateTimeLocalInputToIso,
  parseMoneyInputToCents,
} from "../lib/formatters.js";
import {
  cleaningSimulationSelectOptions,
  fieldOptions,
  parseIntegerInput,
  parseNumberInput,
  schedulingModeLabels,
} from "../lib/quote-form-options.js";
export function CompanyAreaPage() {
  const contactUrl = import.meta.env.VITE_VELARIS_CONTACT_URL as string | undefined;
  const accountQuery = useQuery({
    queryKey: ["company-account"],
    queryFn: () => apiRequest<{ account: CompanyAccountStatus }>("/api/company/me"),
  });
  const account = accountQuery.data?.account;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Empresa" title="Painel da empresa" />
          {account ? (
            <div className="flex gap-2">
              <StatusBadge status={account.status} />
              <ProfileBadge status={account.profileStatus} />
            </div>
          ) : null}
        </div>
        {accountQuery.isLoading ? <LoadingLine /> : null}
        {accountQuery.error ? (
          <ErrorPanel
            error={accountQuery.error}
            fallback="Entre como empresa para continuar."
          />
        ) : null}
        {account ? (
          <section className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{account.tradingName}</h2>
                <p className="mt-2 text-sm text-white/60">{account.ownerEmail}</p>
              </div>
              <CompanyContactAction contactUrl={contactUrl} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoBlock label="Slug" value={account.slug} />
              <InfoBlock label="Papel" value={account.memberRole} />
              <InfoBlock label="Cadastro" value={formatDate(account.createdAt)} />
            </div>
          </section>
        ) : null}
        {account?.status === "active" ? (
          <CompanyQuoteRequestsPanel />
        ) : account ? (
          <CompanyPendingPanel contactUrl={contactUrl} />
        ) : null}
      </main>
    </AppShell>
  );
}

function CompanyContactAction({ contactUrl }: { contactUrl: string | undefined }) {
  return contactUrl ? (
    <a
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-300 px-4 py-2 font-medium text-[#111216]"
      href={contactUrl}
      rel="noreferrer"
      target="_blank"
    >
      <ExternalLink size={18} />
      Contato com a Velaris
    </a>
  ) : (
    <button
      className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-white/45"
      disabled
      type="button"
    >
      <ExternalLink size={18} />
      Contato com a Velaris
    </button>
  );
}

function CompanyPendingPanel({ contactUrl }: { contactUrl: string | undefined }) {
  return (
    <section className="mt-6 rounded-md border border-amber-300/25 bg-amber-300/10 p-5">
      <h2 className="text-lg font-semibold text-amber-100">Cadastro em analise</h2>
      <p className="mt-2 text-sm leading-6 text-amber-50/75">
        A area operacional fica disponivel depois da ativacao manual da empresa.
      </p>
      <div className="mt-4">
        <CompanyContactAction contactUrl={contactUrl} />
      </div>
    </section>
  );
}

type CompanyQuoteStatusFilter =
  | "all"
  | "submitted"
  | "under_review"
  | "awaiting_information"
  | "accepted_for_proposal"
  | "declined_by_company";

const companyQuoteStatusFilters: Array<[CompanyQuoteStatusFilter, string]> = [
  ["all", "Todos"],
  ["submitted", "Recebidos"],
  ["under_review", "Em revisao"],
  ["awaiting_information", "Aguardando dados"],
  ["accepted_for_proposal", "Aceitos"],
  ["declined_by_company", "Recusados"],
];

const declineReasonLabels = [
  ["price", "Valor"],
  ["deadline", "Prazo"],
  ["schedule", "Horario"],
  ["hired_another_company", "Contratou outra empresa"],
  ["gave_up", "Desistiu"],
  ["other", "Outro"],
] as const;

function CompanyQuoteRequestsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CompanyQuoteStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appointmentConflictWarning, setAppointmentConflictWarning] = useState<
    CompanyAppointmentConflict[]
  >([]);
  const requestsQuery = useQuery({
    queryKey: ["company-quote-requests", statusFilter],
    queryFn: () => {
      const search =
        statusFilter === "all"
          ? ""
          : `?${new URLSearchParams({ status: statusFilter }).toString()}`;
      return apiRequest<CompanyQuoteRequestsListResponse>(
        `/api/company/quote-requests${search}`,
      );
    },
  });
  const quoteRequests = requestsQuery.data?.quoteRequests ?? [];

  useEffect(() => {
    if (quoteRequests.length === 0) {
      setSelectedId(null);
      return;
    }

    if (
      !selectedId ||
      !quoteRequests.some((quoteRequest) => quoteRequest.id === selectedId)
    ) {
      setSelectedId(quoteRequests[0]!.id);
    }
  }, [quoteRequests, selectedId]);

  useEffect(() => {
    setAppointmentConflictWarning([]);
  }, [selectedId]);

  const detailQuery = useQuery({
    enabled: Boolean(selectedId),
    queryKey: ["company-quote-request", selectedId],
    queryFn: () =>
      apiRequest<CompanyQuoteRequestDetailResponse>(
        `/api/company/quote-requests/${String(selectedId)}`,
      ),
  });

  function syncQuoteRequest(response: CompanyQuoteRequestDetailResponse) {
    queryClient.setQueryData(
      ["company-quote-request", response.quoteRequest.id],
      response,
    );
    void queryClient.invalidateQueries({ queryKey: ["company-quote-requests"] });
  }

  const reviewMutation = useMutation({
    mutationFn: (input: {
      id: string;
      body: Parameters<typeof companyQuoteRequestReviewRequestSchema.parse>[0];
    }) =>
      apiRequest<CompanyQuoteRequestDetailResponse>(
        `/api/company/quote-requests/${input.id}/review`,
        {
          method: "PATCH",
          body: JSON.stringify(companyQuoteRequestReviewRequestSchema.parse(input.body)),
        },
      ),
    onSuccess: syncQuoteRequest,
  });

  const declineMutation = useMutation({
    mutationFn: (input: {
      id: string;
      body: Parameters<typeof companyQuoteRequestDeclineRequestSchema.parse>[0];
    }) =>
      apiRequest<CompanyQuoteRequestDetailResponse>(
        `/api/company/quote-requests/${input.id}/decline`,
        {
          method: "POST",
          body: JSON.stringify(companyQuoteRequestDeclineRequestSchema.parse(input.body)),
        },
      ),
    onSuccess: syncQuoteRequest,
  });

  const createProposalMutation = useMutation({
    mutationFn: (input: {
      quoteRequestId: string;
      body: Parameters<typeof companyCreateProposalRequestSchema.parse>[0];
    }) =>
      apiRequest<CompanyProposalDetailResponse>(
        `/api/company/quote-requests/${input.quoteRequestId}/proposals`,
        {
          method: "POST",
          body: JSON.stringify(companyCreateProposalRequestSchema.parse(input.body)),
        },
      ),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["company-quote-request", variables.quoteRequestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["company-quote-requests"] });
    },
  });

  const sendProposalMutation = useMutation({
    mutationFn: (input: { quoteRequestId: string; proposalId: string }) =>
      apiRequest<CompanyProposalDetailResponse>(
        `/api/company/proposals/${input.proposalId}/send`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        },
      ),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["company-quote-request", variables.quoteRequestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["company-quote-requests"] });
    },
  });

  const proposeAppointmentMutation = useMutation({
    mutationFn: (input: {
      quoteRequestId: string;
      proposalId: string;
      body: Parameters<typeof companyProposeAppointmentRequestSchema.parse>[0];
    }) =>
      apiRequest<CompanyAppointmentResponse>(
        `/api/company/proposals/${input.proposalId}/appointment`,
        {
          method: "POST",
          body: JSON.stringify(companyProposeAppointmentRequestSchema.parse(input.body)),
        },
      ),
    onSuccess: (response, variables) => {
      setAppointmentConflictWarning(response.conflictWarning);
      void queryClient.invalidateQueries({
        queryKey: ["company-quote-request", variables.quoteRequestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["company-quote-requests"] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: (input: {
      quoteRequestId: string;
      appointmentId: string;
      body: Parameters<typeof companyUpdateAppointmentRequestSchema.parse>[0];
    }) =>
      apiRequest<CompanyAppointmentResponse>(
        `/api/company/appointments/${input.appointmentId}`,
        {
          method: "PATCH",
          body: JSON.stringify(companyUpdateAppointmentRequestSchema.parse(input.body)),
        },
      ),
    onSuccess: (response, variables) => {
      setAppointmentConflictWarning(response.conflictWarning);
      void queryClient.invalidateQueries({
        queryKey: ["company-quote-request", variables.quoteRequestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["company-quote-requests"] });
    },
  });

  const completeAppointmentMutation = useMutation({
    mutationFn: (input: { quoteRequestId: string; appointmentId: string }) =>
      apiRequest<CompanyAppointmentResponse>(
        `/api/company/appointments/${input.appointmentId}/complete`,
        {
          method: "POST",
        },
      ),
    onSuccess: (_response, variables) => {
      setAppointmentConflictWarning([]);
      void queryClient.invalidateQueries({
        queryKey: ["company-quote-request", variables.quoteRequestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["company-quote-requests"] });
    },
  });

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        {requestsQuery.data ? (
          <CompanyDashboardGrid dashboard={requestsQuery.data.dashboard} />
        ) : null}
        <section className="rounded-md border border-white/10 bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList size={18} />
              Solicitacoes
            </h2>
            <select
              className="h-10 rounded-md border border-white/15 bg-[#15171d] px-3 text-sm text-white outline-none focus:border-emerald-300"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as CompanyQuoteStatusFilter)
              }
            >
              {companyQuoteStatusFilters.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {requestsQuery.isLoading ? <LoadingLine /> : null}
          {requestsQuery.error ? (
            <ErrorPanel
              error={requestsQuery.error}
              fallback="Nao foi possivel carregar solicitacoes."
            />
          ) : null}
          <CompanyQuoteRequestList
            quoteRequests={quoteRequests}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>
      </div>
      <CompanyQuoteRequestDetailPanel
        appointmentConflictWarning={appointmentConflictWarning}
        appointmentError={
          proposeAppointmentMutation.error
            ? errorMessage(
                proposeAppointmentMutation.error,
                "Nao foi possivel propor o horario.",
              )
            : updateAppointmentMutation.error
              ? errorMessage(
                  updateAppointmentMutation.error,
                  "Nao foi possivel atualizar o horario.",
                )
              : completeAppointmentMutation.error
                ? errorMessage(
                    completeAppointmentMutation.error,
                    "Nao foi possivel concluir o horario.",
                  )
                : null
        }
        createProposalError={createProposalMutation.error}
        declineError={declineMutation.error}
        detail={detailQuery.data?.quoteRequest ?? null}
        isCompletingAppointment={completeAppointmentMutation.isPending}
        isCreatingProposal={createProposalMutation.isPending}
        isDeclining={declineMutation.isPending}
        isLoading={detailQuery.isLoading}
        isProposingAppointment={proposeAppointmentMutation.isPending}
        isSendingProposal={sendProposalMutation.isPending}
        isUpdatingAppointment={updateAppointmentMutation.isPending}
        isReviewing={reviewMutation.isPending}
        reviewError={reviewMutation.error}
        sendProposalError={sendProposalMutation.error}
        onCreateProposal={(quoteRequestId, body) =>
          createProposalMutation.mutate({ quoteRequestId, body })
        }
        onDecline={(id, body) => declineMutation.mutate({ id, body })}
        onCompleteAppointment={(quoteRequestId, appointmentId) =>
          completeAppointmentMutation.mutate({ quoteRequestId, appointmentId })
        }
        onProposeAppointment={(quoteRequestId, proposalId, body) =>
          proposeAppointmentMutation.mutate({ quoteRequestId, proposalId, body })
        }
        onReview={(id, body) => reviewMutation.mutate({ id, body })}
        onSendProposal={(quoteRequestId, proposalId) =>
          sendProposalMutation.mutate({ quoteRequestId, proposalId })
        }
        onUpdateAppointment={(quoteRequestId, appointmentId, body) =>
          updateAppointmentMutation.mutate({ quoteRequestId, appointmentId, body })
        }
      />
    </section>
  );
}

function CompanyDashboardGrid({ dashboard }: { dashboard: CompanyQuoteDashboard }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <InfoBlock label="Recebidas" value={String(dashboard.receivedCount)} />
      <InfoBlock label="Novas" value={String(dashboard.submittedCount)} />
      <InfoBlock label="Em revisao" value={String(dashboard.underReviewCount)} />
      <InfoBlock label="Aceitas" value={String(dashboard.acceptedForProposalCount)} />
      <InfoBlock label="Recusadas" value={String(dashboard.declinedCount)} />
      <InfoBlock
        label="Tempo medio"
        value={
          dashboard.averageResponseMinutes === null
            ? "Sem historico"
            : formatDurationMinutes(dashboard.averageResponseMinutes)
        }
      />
    </section>
  );
}

function CompanyQuoteRequestList({
  quoteRequests,
  selectedId,
  onSelect,
}: {
  quoteRequests: CompanyQuoteRequestSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (quoteRequests.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-white/50">Nenhuma solicitacao neste filtro.</p>
    );
  }

  return (
    <div className="divide-y divide-white/10">
      {quoteRequests.map((quoteRequest) => (
        <button
          className={`block w-full px-4 py-4 text-left transition ${
            selectedId === quoteRequest.id ? "bg-emerald-300/10" : "hover:bg-white/[0.04]"
          }`}
          key={quoteRequest.id}
          type="button"
          onClick={() => onSelect(quoteRequest.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white/90">
                {quoteRequest.requestCode ?? "Sem codigo"}
              </div>
              <div className="mt-1 text-xs text-white/45">
                {quoteRequest.customerName} - {quoteRequest.itemCount} item(ns)
              </div>
            </div>
            <QuoteRequestStatusBadge status={quoteRequest.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
            <span>{quoteRequest.serviceName}</span>
            <span>
              {quoteRequest.estimateMinCents !== null &&
              quoteRequest.estimateMaxCents !== null
                ? `${formatMoneyCents(
                    quoteRequest.estimateMinCents,
                  )} a ${formatMoneyCents(quoteRequest.estimateMaxCents)}`
                : "Sem estimativa"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function CompanyQuoteRequestDetailPanel({
  appointmentConflictWarning,
  appointmentError,
  createProposalError,
  declineError,
  detail,
  isCompletingAppointment,
  isCreatingProposal,
  isDeclining,
  isLoading,
  isProposingAppointment,
  isSendingProposal,
  isUpdatingAppointment,
  isReviewing,
  reviewError,
  sendProposalError,
  onCompleteAppointment,
  onCreateProposal,
  onDecline,
  onProposeAppointment,
  onReview,
  onSendProposal,
  onUpdateAppointment,
}: {
  appointmentConflictWarning: CompanyAppointmentConflict[];
  appointmentError: string | null;
  createProposalError: unknown;
  declineError: unknown;
  detail: CompanyQuoteRequestDetail | null;
  isCompletingAppointment: boolean;
  isCreatingProposal: boolean;
  isDeclining: boolean;
  isLoading: boolean;
  isProposingAppointment: boolean;
  isSendingProposal: boolean;
  isUpdatingAppointment: boolean;
  isReviewing: boolean;
  reviewError: unknown;
  sendProposalError: unknown;
  onCompleteAppointment: (quoteRequestId: string, appointmentId: string) => void;
  onCreateProposal: (
    quoteRequestId: string,
    body: Parameters<typeof companyCreateProposalRequestSchema.parse>[0],
  ) => void;
  onDecline: (
    id: string,
    body: Parameters<typeof companyQuoteRequestDeclineRequestSchema.parse>[0],
  ) => void;
  onReview: (
    id: string,
    body: Parameters<typeof companyQuoteRequestReviewRequestSchema.parse>[0],
  ) => void;
  onProposeAppointment: (
    quoteRequestId: string,
    proposalId: string,
    body: Parameters<typeof companyProposeAppointmentRequestSchema.parse>[0],
  ) => void;
  onSendProposal: (quoteRequestId: string, proposalId: string) => void;
  onUpdateAppointment: (
    quoteRequestId: string,
    appointmentId: string,
    body: Parameters<typeof companyUpdateAppointmentRequestSchema.parse>[0],
  ) => void;
}) {
  if (isLoading) {
    return (
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <LoadingLine />
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6 text-sm text-white/50">
        Selecione uma solicitacao.
      </section>
    );
  }

  return (
    <CompanyQuoteRequestDetailView
      appointmentConflictWarning={appointmentConflictWarning}
      appointmentError={appointmentError}
      createProposalError={createProposalError}
      declineError={declineError}
      isCompletingAppointment={isCompletingAppointment}
      isCreatingProposal={isCreatingProposal}
      isDeclining={isDeclining}
      isProposingAppointment={isProposingAppointment}
      isSendingProposal={isSendingProposal}
      isUpdatingAppointment={isUpdatingAppointment}
      isReviewing={isReviewing}
      quoteRequest={detail}
      reviewError={reviewError}
      sendProposalError={sendProposalError}
      onCompleteAppointment={onCompleteAppointment}
      onCreateProposal={onCreateProposal}
      onDecline={onDecline}
      onProposeAppointment={onProposeAppointment}
      onReview={onReview}
      onSendProposal={onSendProposal}
      onUpdateAppointment={onUpdateAppointment}
    />
  );
}

function CompanyQuoteRequestDetailView({
  appointmentConflictWarning,
  appointmentError,
  createProposalError,
  declineError,
  isCompletingAppointment,
  isCreatingProposal,
  isDeclining,
  isProposingAppointment,
  isSendingProposal,
  isUpdatingAppointment,
  isReviewing,
  quoteRequest,
  reviewError,
  sendProposalError,
  onCompleteAppointment,
  onCreateProposal,
  onDecline,
  onProposeAppointment,
  onReview,
  onSendProposal,
  onUpdateAppointment,
}: {
  appointmentConflictWarning: CompanyAppointmentConflict[];
  appointmentError: string | null;
  createProposalError: unknown;
  declineError: unknown;
  isCompletingAppointment: boolean;
  isCreatingProposal: boolean;
  isDeclining: boolean;
  isProposingAppointment: boolean;
  isSendingProposal: boolean;
  isUpdatingAppointment: boolean;
  isReviewing: boolean;
  quoteRequest: CompanyQuoteRequestDetail;
  reviewError: unknown;
  sendProposalError: unknown;
  onCompleteAppointment: (quoteRequestId: string, appointmentId: string) => void;
  onCreateProposal: (
    quoteRequestId: string,
    body: Parameters<typeof companyCreateProposalRequestSchema.parse>[0],
  ) => void;
  onDecline: (
    id: string,
    body: Parameters<typeof companyQuoteRequestDeclineRequestSchema.parse>[0],
  ) => void;
  onReview: (
    id: string,
    body: Parameters<typeof companyQuoteRequestReviewRequestSchema.parse>[0],
  ) => void;
  onProposeAppointment: (
    quoteRequestId: string,
    proposalId: string,
    body: Parameters<typeof companyProposeAppointmentRequestSchema.parse>[0],
  ) => void;
  onSendProposal: (quoteRequestId: string, proposalId: string) => void;
  onUpdateAppointment: (
    quoteRequestId: string,
    appointmentId: string,
    body: Parameters<typeof companyUpdateAppointmentRequestSchema.parse>[0],
  ) => void;
}) {
  const [reviewData, setReviewData] = useState<QuoteDraftData>(quoteRequest.data);
  const [reviewReason, setReviewReason] = useState("");
  const [declineReasonCode, setDeclineReasonCode] =
    useState<(typeof declineReasonLabels)[number][0]>("deadline");
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    setReviewData(quoteRequest.data);
    setReviewReason("");
    setDeclineReason("");
    setDeclineReasonCode("deadline");
  }, [quoteRequest.id, quoteRequest.updatedAt, quoteRequest.data]);

  const canOpenReview = quoteRequest.status === "submitted";
  const canEditReview = quoteRequest.status === "under_review";
  const hasLocalChanges = !sameJsonValue(reviewData, quoteRequest.data);
  const mutationError = reviewError
    ? errorMessage(reviewError, "Nao foi possivel revisar a solicitacao.")
    : declineError
      ? errorMessage(declineError, "Nao foi possivel recusar a solicitacao.")
      : null;

  function updateItem(itemId: string, patch: Partial<QuoteDraftItem>) {
    setReviewData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));
  }

  function updateAccess(patch: Partial<QuoteDraftData["access"]>) {
    setReviewData((current) => ({
      ...current,
      access: {
        ...current.access,
        ...patch,
      },
    }));
  }

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {quoteRequest.requestCode ?? "Solicitacao"}
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {quoteRequest.customerName} - {quoteRequest.customerWhatsapp}
            </p>
          </div>
          <QuoteRequestStatusBadge status={quoteRequest.status} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoBlock label="Servico" value={quoteRequest.serviceName} />
          <InfoBlock
            label="Recebida"
            value={
              quoteRequest.submittedAt ? formatDate(quoteRequest.submittedAt) : "Sem data"
            }
          />
          <InfoBlock
            label="Configuracao"
            value={`v${quoteRequest.configurationVersion} / precos v${quoteRequest.pricingVersion}`}
          />
        </div>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold">Dados tecnicos</h3>
            <div className="mt-4 space-y-4">
              {reviewData.items.map((item, index) => (
                <CompanyReviewItemEditor
                  disabled={!canEditReview}
                  index={index}
                  item={item}
                  key={item.id}
                  quoteRequest={quoteRequest}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold">Acesso e deslocamento</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SelectField
                disabled={!canEditReview}
                label="Urgencia"
                options={fieldOptions(
                  quoteRequest,
                  "urgency",
                  cleaningSimulationSelectOptions.urgency,
                )}
                value={reviewData.access.urgency}
                onChange={(urgency) => updateAccess({ urgency })}
              />
              <TextField
                disabled={!canEditReview}
                inputMode="numeric"
                label="Andar"
                value={reviewData.access.floor}
                onChange={(event) =>
                  updateAccess({ floor: parseIntegerInput(event.target.value) })
                }
              />
              <TextField
                disabled={!canEditReview}
                inputMode="decimal"
                label="Distancia em km"
                value={reviewData.access.distanceKm}
                onChange={(event) =>
                  updateAccess({ distanceKm: parseNumberInput(event.target.value) })
                }
              />
              <CheckboxField
                checked={reviewData.access.hasElevator}
                disabled={!canEditReview}
                label="Possui elevador"
                onChange={(hasElevator) => updateAccess({ hasElevator })}
              />
              <CheckboxField
                checked={reviewData.access.parking}
                disabled={!canEditReview}
                label="Possui estacionamento"
                onChange={(parking) => updateAccess({ parking })}
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold">Endereco e observacoes</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoBlock
                label="Endereco"
                value={
                  reviewData.address.fullAddress ||
                  [
                    reviewData.address.street,
                    reviewData.address.number,
                    reviewData.address.neighborhood,
                    reviewData.address.city,
                    reviewData.address.state,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "Nao informado"
                }
              />
              <InfoBlock
                label="Observacoes"
                value={reviewData.notes || "Sem observacoes"}
              />
            </div>
          </section>

          <CompanyFilesPanel files={quoteRequest.files} />
          <CompanyRevisionTimeline quoteRequest={quoteRequest} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <CompanyEstimatePanel quoteRequest={quoteRequest} />
          <CompanyProposalPanel
            error={
              createProposalError
                ? errorMessage(createProposalError, "Nao foi possivel criar a proposta.")
                : sendProposalError
                  ? errorMessage(sendProposalError, "Nao foi possivel enviar a proposta.")
                  : null
            }
            isCreating={isCreatingProposal}
            isSending={isSendingProposal}
            quoteRequest={quoteRequest}
            onCreateProposal={onCreateProposal}
            onSendProposal={onSendProposal}
          />
          <CompanyAppointmentPanel
            conflictWarning={appointmentConflictWarning}
            error={appointmentError}
            isCompleting={isCompletingAppointment}
            isProposing={isProposingAppointment}
            isUpdating={isUpdatingAppointment}
            quoteRequest={quoteRequest}
            onCompleteAppointment={onCompleteAppointment}
            onProposeAppointment={onProposeAppointment}
            onUpdateAppointment={onUpdateAppointment}
          />
          <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
            <h3 className="text-lg font-semibold">Revisao</h3>
            {canEditReview ? (
              <TextAreaField
                className="mt-4"
                label="Motivo da revisao"
                rows={3}
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
              />
            ) : null}
            <div className="mt-4 grid gap-2">
              <ActionButton
                disabled={!canOpenReview}
                icon={ClipboardList}
                isLoading={isReviewing}
                onClick={() =>
                  onReview(quoteRequest.id, {
                    action: "open_review",
                  })
                }
              >
                Abrir revisao
              </ActionButton>
              <ActionButton
                disabled={!canEditReview}
                icon={Calculator}
                isLoading={isReviewing}
                variant="secondary"
                onClick={() =>
                  onReview(quoteRequest.id, {
                    action: "save_review",
                    data: reviewData,
                    reason: reviewReason,
                  })
                }
              >
                Salvar e recalcular
              </ActionButton>
              <ActionButton
                disabled={!canEditReview || hasLocalChanges}
                icon={CheckCircle2}
                isLoading={isReviewing}
                onClick={() =>
                  onReview(quoteRequest.id, {
                    action: "accept_for_proposal",
                  })
                }
              >
                Aceitar para proposta
              </ActionButton>
            </div>
            <FormError message={mutationError} />
          </section>

          <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
            <h3 className="text-lg font-semibold">Recusa</h3>
            <label className="mt-4 block text-sm text-white/70">
              Motivo
              <select
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!canEditReview}
                value={declineReasonCode}
                onChange={(event) =>
                  setDeclineReasonCode(event.target.value as typeof declineReasonCode)
                }
              >
                {declineReasonLabels.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <TextAreaField
              className="mt-4"
              disabled={!canEditReview}
              label="Descricao"
              rows={3}
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
            />
            <div className="mt-4">
              <ActionButton
                disabled={!canEditReview || declineReason.trim().length < 3}
                icon={Ban}
                isLoading={isDeclining}
                variant="warning"
                onClick={() =>
                  onDecline(quoteRequest.id, {
                    reasonCode: declineReasonCode,
                    reason: declineReason,
                  })
                }
              >
                Recusar
              </ActionButton>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function CompanyReviewItemEditor({
  disabled,
  index,
  item,
  quoteRequest,
  onUpdate,
}: {
  disabled: boolean;
  index: number;
  item: QuoteDraftItem;
  quoteRequest: CompanyQuoteRequestDetail;
  onUpdate: (patch: Partial<QuoteDraftItem>) => void;
}) {
  const stainOptions = fieldOptions(quoteRequest, "stain_type", []);

  function toggleStainType(value: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...item.stainTypes, value]))
      : item.stainTypes.filter((candidate) => candidate !== value);
    onUpdate({ stainTypes: next });
  }

  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TextField
          className="min-w-[220px] flex-1"
          disabled={disabled}
          label={`Item ${index + 1}`}
          value={item.label}
          onChange={(event) => onUpdate({ label: event.target.value })}
        />
        <span className="self-end rounded-md border border-white/15 px-3 py-2 text-sm text-white/55">
          {item.id}
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <SelectField
          disabled={disabled}
          label="Tipo"
          options={fieldOptions(
            quoteRequest,
            "item_type",
            cleaningSimulationSelectOptions.itemType,
          )}
          value={item.itemType}
          onChange={(itemType) => onUpdate({ itemType })}
        />
        <TextField
          disabled={disabled}
          inputMode="numeric"
          label="Quantidade identica"
          value={item.quantity}
          onChange={(event) =>
            onUpdate({ quantity: Math.max(1, parseIntegerInput(event.target.value)) })
          }
        />
        <SelectField
          disabled={disabled}
          label="Tamanho"
          options={fieldOptions(
            quoteRequest,
            "size",
            cleaningSimulationSelectOptions.size,
          )}
          value={item.size}
          onChange={(size) => onUpdate({ size })}
        />
        <TextField
          disabled={disabled}
          inputMode="numeric"
          label="Lugares"
          value={item.seats}
          onChange={(event) => onUpdate({ seats: parseIntegerInput(event.target.value) })}
        />
        <SelectField
          disabled={disabled}
          label="Tecido"
          options={fieldOptions(
            quoteRequest,
            "fabric_type",
            cleaningSimulationSelectOptions.fabricType,
          )}
          value={item.fabricType}
          onChange={(fabricType) => onUpdate({ fabricType })}
        />
        <SelectField
          disabled={disabled}
          label="Sujeira"
          options={fieldOptions(
            quoteRequest,
            "dirt_level",
            cleaningSimulationSelectOptions.dirtLevel,
          )}
          value={item.dirtLevel}
          onChange={(dirtLevel) => onUpdate({ dirtLevel })}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <CheckboxField
          checked={item.hasStains}
          disabled={disabled}
          label="Possui manchas"
          onChange={(hasStains) => onUpdate({ hasStains })}
        />
        <CheckboxField
          checked={item.odor}
          disabled={disabled}
          label="Possui odor"
          onChange={(odor) => onUpdate({ odor })}
        />
        <CheckboxField
          checked={item.petHair}
          disabled={disabled}
          label="Possui pelos"
          onChange={(petHair) => onUpdate({ petHair })}
        />
        <CheckboxField
          checked={item.petsPresent}
          disabled={disabled}
          label="Animais no local"
          onChange={(petsPresent) => onUpdate({ petsPresent })}
        />
        <CheckboxField
          checked={item.waterproofing}
          disabled={disabled}
          label="Impermeabilizacao"
          onChange={(waterproofing) => onUpdate({ waterproofing })}
        />
      </div>
      {stainOptions.length > 0 ? (
        <div className="mt-4">
          <div className="text-sm text-white/70">Tipos de mancha</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stainOptions.map(([value, label]) => (
              <label
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white/70 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55"
                key={value}
              >
                <input
                  checked={item.stainTypes.includes(value)}
                  className="h-4 w-4 accent-emerald-300"
                  disabled={disabled}
                  type="checkbox"
                  onChange={(event) => toggleStainType(value, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <TextAreaField
        className="mt-4"
        disabled={disabled}
        label="Observacao do item"
        rows={2}
        value={item.notes}
        onChange={(event) => onUpdate({ notes: event.target.value })}
      />
    </div>
  );
}

function CompanyFilesPanel({ files }: { files: CompanyQuoteRequestDetail["files"] }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <FileText size={18} />
        Arquivos
      </h3>
      {files.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">Nenhum arquivo vinculado.</p>
      ) : (
        <div className="mt-3 divide-y divide-white/10 rounded-md border border-white/10">
          {files.map((file) => (
            <div
              className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1fr_auto]"
              key={file.id}
            >
              <div>
                <div className="font-medium text-white/85">{file.fileName}</div>
                <div className="mt-1 text-xs text-white/45">
                  {file.mimeType} - {formatFileSize(file.sizeBytes)}
                </div>
              </div>
              <div className="text-xs text-white/45">{formatDate(file.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CompanyProposalPanel({
  error,
  isCreating,
  isSending,
  quoteRequest,
  onCreateProposal,
  onSendProposal,
}: {
  error: string | null;
  isCreating: boolean;
  isSending: boolean;
  quoteRequest: CompanyQuoteRequestDetail;
  onCreateProposal: (
    quoteRequestId: string,
    body: Parameters<typeof companyCreateProposalRequestSchema.parse>[0],
  ) => void;
  onSendProposal: (quoteRequestId: string, proposalId: string) => void;
}) {
  const estimate = quoteRequest.estimate;
  const suggestedTotalCents =
    estimate?.internalTotalCents ?? quoteRequest.internalTotalCents ?? 0;
  const latestProposal = getLatestProposalSummary(quoteRequest.proposals);
  const hasAcceptedVersion = quoteRequest.proposals.some(
    (proposal) => proposal.acceptedQuoteVersionId,
  );
  const [finalTotal, setFinalTotal] = useState(
    formatMoneyInputFromCents(suggestedTotalCents),
  );
  const [validUntil, setValidUntil] = useState(
    formatDateTimeLocalInput(addDaysToDate(new Date(), 7)),
  );
  const [outOfRangeReason, setOutOfRangeReason] = useState("");
  const [terms, setTerms] = useState("");
  const [termsVersion, setTermsVersion] = useState("draft-v1");

  useEffect(() => {
    setFinalTotal(formatMoneyInputFromCents(suggestedTotalCents));
    setValidUntil(formatDateTimeLocalInput(addDaysToDate(new Date(), 7)));
    setOutOfRangeReason("");
    setTerms("");
    setTermsVersion("draft-v1");
  }, [quoteRequest.id, quoteRequest.updatedAt, suggestedTotalCents]);

  const finalTotalCents = parseMoneyInputToCents(finalTotal);
  const validUntilIso = parseDateTimeLocalInputToIso(validUntil);
  const isOutsideRange =
    finalTotalCents !== null &&
    estimate !== null &&
    (finalTotalCents < estimate.estimateMinCents ||
      finalTotalCents > estimate.estimateMaxCents);
  const canCreate =
    quoteRequest.status === "accepted_for_proposal" &&
    estimate !== null &&
    !hasAcceptedVersion &&
    finalTotalCents !== null &&
    finalTotalCents > 0 &&
    Boolean(validUntilIso) &&
    (!isOutsideRange || outOfRangeReason.trim().length > 0);
  const latestDraftCanSend =
    quoteRequest.status === "accepted_for_proposal" &&
    latestProposal?.latestVersionStatus === "draft" &&
    !hasAcceptedVersion &&
    hasRequiredAppointmentForProposal(quoteRequest);
  const requiresAppointmentBeforeSend =
    quoteRequest.service.schedulingMode === "required_with_proposal";

  function createProposal() {
    if (!canCreate || finalTotalCents === null || !validUntilIso) {
      return;
    }

    onCreateProposal(quoteRequest.id, {
      finalTotalCents,
      validUntil: validUntilIso,
      outOfRangeReason,
      terms,
      termsVersion,
    });
  }

  return (
    <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <FileText size={18} />
        Proposta
      </h3>

      {quoteRequest.status !== "accepted_for_proposal" ? (
        <p className="mt-4 text-sm text-white/50">
          A solicitacao precisa estar aceita para proposta.
        </p>
      ) : null}

      {estimate ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <InfoBlock
              label="Sugerido"
              value={formatMoneyCents(estimate.internalTotalCents)}
            />
            <InfoBlock
              label="Faixa"
              value={`${formatMoneyCents(estimate.estimateMinCents)} a ${formatMoneyCents(
                estimate.estimateMaxCents,
              )}`}
            />
          </div>

          <TextField
            disabled={hasAcceptedVersion}
            inputMode="decimal"
            label="Valor final"
            value={finalTotal}
            onChange={(event) => setFinalTotal(event.target.value)}
          />
          <TextField
            disabled={hasAcceptedVersion}
            label="Validade"
            type="datetime-local"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
          {isOutsideRange ? (
            <TextAreaField
              disabled={hasAcceptedVersion}
              label="Justificativa fora da faixa"
              rows={3}
              value={outOfRangeReason}
              onChange={(event) => setOutOfRangeReason(event.target.value)}
            />
          ) : null}
          <TextAreaField
            disabled={hasAcceptedVersion}
            label="Termos comerciais"
            rows={3}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
          />
          <TextField
            disabled={hasAcceptedVersion}
            label="Versao dos termos"
            value={termsVersion}
            onChange={(event) => setTermsVersion(event.target.value)}
          />

          <div className="grid gap-2">
            <ActionButton
              disabled={!canCreate}
              icon={PlusCircle}
              isLoading={isCreating}
              onClick={createProposal}
            >
              {latestProposal ? "Criar nova versao" : "Criar proposta"}
            </ActionButton>
            <ActionButton
              disabled={!latestDraftCanSend || !latestProposal?.latestVersionId}
              icon={Send}
              isLoading={isSending}
              variant="secondary"
              onClick={() => {
                if (latestProposal?.latestVersionId) {
                  onSendProposal(quoteRequest.id, latestProposal.id);
                }
              }}
            >
              Enviar proposta
            </ActionButton>
          </div>
          {requiresAppointmentBeforeSend &&
          !hasRequiredAppointmentForProposal(quoteRequest) ? (
            <p className="text-xs text-amber-100">
              Este servico exige horario proposto antes do envio da proposta.
            </p>
          ) : null}
          <FormError message={error} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/50">Sem calculo revisado.</p>
      )}

      {quoteRequest.proposals.length > 0 ? (
        <div className="mt-5 divide-y divide-white/10 rounded-md border border-white/10">
          {quoteRequest.proposals.map((proposal) => (
            <div className="space-y-2 px-3 py-3" key={proposal.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-white/85">
                  {proposal.latestProposalCode ?? "Proposta sem codigo"}
                </span>
                {proposal.latestVersionStatus ? (
                  <ProposalVersionStatusBadge status={proposal.latestVersionStatus} />
                ) : null}
              </div>
              <div className="grid gap-2 text-xs text-white/45">
                <span>
                  Versao {proposal.latestVersionNumber ?? "-"} -{" "}
                  {proposal.finalTotalCents === null
                    ? "Sem valor"
                    : formatMoneyCents(proposal.finalTotalCents)}
                </span>
                <span>
                  Validade{" "}
                  {proposal.validUntil ? formatDate(proposal.validUntil) : "sem data"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CompanyAppointmentPanel({
  conflictWarning,
  error,
  isCompleting,
  isProposing,
  isUpdating,
  quoteRequest,
  onCompleteAppointment,
  onProposeAppointment,
  onUpdateAppointment,
}: {
  conflictWarning: CompanyAppointmentConflict[];
  error: string | null;
  isCompleting: boolean;
  isProposing: boolean;
  isUpdating: boolean;
  quoteRequest: CompanyQuoteRequestDetail;
  onCompleteAppointment: (quoteRequestId: string, appointmentId: string) => void;
  onProposeAppointment: (
    quoteRequestId: string,
    proposalId: string,
    body: Parameters<typeof companyProposeAppointmentRequestSchema.parse>[0],
  ) => void;
  onUpdateAppointment: (
    quoteRequestId: string,
    appointmentId: string,
    body: Parameters<typeof companyUpdateAppointmentRequestSchema.parse>[0],
  ) => void;
}) {
  const latestProposal = getLatestProposalSummary(quoteRequest.proposals);
  const latestAppointment = getLatestAppointment(quoteRequest.appointments);
  const activeAppointment =
    latestAppointment && !["completed", "cancelled"].includes(latestAppointment.status)
      ? latestAppointment
      : null;
  const defaultDuration = quoteRequest.service.estimatedDurationMinutes ?? 120;
  const [startsAt, setStartsAt] = useState(
    formatDateTimeLocalInput(addDaysToDate(new Date(), 1)),
  );
  const [durationMinutes, setDurationMinutes] = useState(String(defaultDuration));
  const [address, setAddress] = useState(formatQuoteAddress(quoteRequest.data.address));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setStartsAt(formatDateTimeLocalInput(addDaysToDate(new Date(), 1)));
    setDurationMinutes(String(defaultDuration));
    setAddress(formatQuoteAddress(quoteRequest.data.address));
    setNotes("");
  }, [
    defaultDuration,
    quoteRequest.id,
    quoteRequest.updatedAt,
    quoteRequest.data.address,
  ]);

  const schedulingMode = quoteRequest.service.schedulingMode;
  const canUsePlatformScheduling = schedulingMode !== "external_only";
  const hasAcceptedVersion = quoteRequest.proposals.some(
    (proposal) =>
      proposal.acceptedQuoteVersionId || proposal.latestVersionStatus === "accepted",
  );
  const waitsForAcceptedProposal =
    schedulingMode === "after_proposal_acceptance" && !hasAcceptedVersion;
  const canCreateInitial =
    quoteRequest.status === "accepted_for_proposal" &&
    canUsePlatformScheduling &&
    Boolean(latestProposal) &&
    !activeAppointment &&
    !waitsForAcceptedProposal;
  const canProposeNewTime =
    quoteRequest.status === "accepted_for_proposal" &&
    canUsePlatformScheduling &&
    Boolean(latestProposal) &&
    activeAppointment?.status === "reschedule_requested" &&
    !waitsForAcceptedProposal;
  const canSubmitSchedule =
    Boolean(parseDateTimeLocalInputToIso(startsAt)) &&
    Math.max(15, parseIntegerInput(durationMinutes)) <= 1440 &&
    (canCreateInitial || canProposeNewTime);
  const warnings =
    conflictWarning.length > 0
      ? conflictWarning
      : (latestAppointment?.conflictWarning ?? []);

  function submitSchedule() {
    const startsAtIso = parseDateTimeLocalInputToIso(startsAt);
    const duration = Math.max(15, parseIntegerInput(durationMinutes));

    if (!startsAtIso || !latestProposal || !canSubmitSchedule) {
      return;
    }

    if (canProposeNewTime && activeAppointment) {
      onUpdateAppointment(quoteRequest.id, activeAppointment.id, {
        action: "propose_new_time",
        startsAt: startsAtIso,
        durationMinutes: duration,
        address,
        notes,
      });
      return;
    }

    onProposeAppointment(quoteRequest.id, latestProposal.id, {
      startsAt: startsAtIso,
      durationMinutes: duration,
      address,
      notes,
    });
  }

  return (
    <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarClock size={18} />
        Agendamento
      </h3>

      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
        {schedulingModeLabels[schedulingMode]}
      </div>

      {latestAppointment ? (
        <div className="mt-4 space-y-3 rounded-md border border-white/10 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-white/85">
              {formatAppointmentWindow(latestAppointment)}
            </span>
            <AppointmentStatusBadge status={latestAppointment.status} />
          </div>
          <div className="grid gap-2 text-xs text-white/45">
            <span>
              Duracao {formatDurationMinutes(latestAppointment.durationMinutes)}
            </span>
            <span>{latestAppointment.address ?? "Endereco nao informado"}</span>
            {latestAppointment.notes ? <span>{latestAppointment.notes}</span> : null}
          </div>
          {latestAppointment.history.length > 0 ? (
            <Timeline
              empty="Nenhum evento de agendamento."
              items={latestAppointment.history.slice(0, 4).map((event) => ({
                id: event.id,
                title: event.eventType,
                detail:
                  event.fromStatus && event.toStatus
                    ? `${appointmentStatusLabels[event.fromStatus]} -> ${
                        appointmentStatusLabels[event.toStatus]
                      }`
                    : "Evento",
                date: event.createdAt,
              }))}
            />
          ) : null}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} />
            Conflito de horario
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {warnings.map((warning) => (
              <div key={warning.appointmentId}>
                {formatDate(warning.startsAt)}
                {warning.proposalCode ? ` - ${warning.proposalCode}` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!latestProposal ? (
        <p className="mt-4 text-sm text-white/50">
          Crie uma proposta antes de propor horario.
        </p>
      ) : null}

      {!canUsePlatformScheduling ? (
        <p className="mt-4 text-sm text-white/50">
          Este servico usa agendamento externo.
        </p>
      ) : waitsForAcceptedProposal ? (
        <p className="mt-4 text-sm text-white/50">
          O horario sera proposto depois do aceite da proposta.
        </p>
      ) : null}

      {canUsePlatformScheduling && latestProposal && !waitsForAcceptedProposal ? (
        <div className="mt-5 space-y-4">
          <TextField
            disabled={!canCreateInitial && !canProposeNewTime}
            label="Data e horario"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <TextField
            disabled={!canCreateInitial && !canProposeNewTime}
            inputMode="numeric"
            label="Duracao em minutos"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
          />
          <TextField
            disabled={!canCreateInitial && !canProposeNewTime}
            label="Endereco"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <TextAreaField
            disabled={!canCreateInitial && !canProposeNewTime}
            label="Observacoes do horario"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <div className="grid gap-2">
            <ActionButton
              disabled={!canSubmitSchedule}
              icon={CalendarClock}
              isLoading={isProposing || isUpdating}
              onClick={submitSchedule}
            >
              {canProposeNewTime ? "Propor novo horario" : "Propor horario"}
            </ActionButton>
            <ActionButton
              disabled={!activeAppointment || activeAppointment.status === "completed"}
              icon={Ban}
              isLoading={isUpdating}
              variant="warning"
              onClick={() => {
                if (activeAppointment) {
                  onUpdateAppointment(quoteRequest.id, activeAppointment.id, {
                    action: "cancel",
                    reason: "Cancelado pela empresa.",
                  });
                }
              }}
            >
              Cancelar horario
            </ActionButton>
            <ActionButton
              disabled={activeAppointment?.status !== "confirmed"}
              icon={CheckCircle2}
              isLoading={isCompleting}
              variant="secondary"
              onClick={() => {
                if (activeAppointment) {
                  onCompleteAppointment(quoteRequest.id, activeAppointment.id);
                }
              }}
            >
              Marcar concluido
            </ActionButton>
          </div>
        </div>
      ) : null}

      <FormError message={error} />
    </section>
  );
}

function CompanyEstimatePanel({
  quoteRequest,
}: {
  quoteRequest: CompanyQuoteRequestDetail;
}) {
  const estimate = quoteRequest.estimate;

  return (
    <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Calculator size={18} />
        Calculo
      </h3>
      {estimate ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="text-sm text-white/50">Faixa estimada</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-100">
              {formatMoneyCents(estimate.estimateMinCents)} a{" "}
              {formatMoneyCents(estimate.estimateMaxCents)}
            </div>
            <div className="mt-1 text-xs text-white/45">
              Total interno {formatMoneyCents(estimate.internalTotalCents)}
            </div>
          </div>
          <div className="divide-y divide-white/10 rounded-md border border-white/10">
            {estimate.itemEstimates.map((item) => (
              <div className="px-3 py-3" key={item.itemId}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-white/85">{item.label}</span>
                  <span>{formatMoneyCents(item.internalTotalCents)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {item.lines.map((line) => (
                    <div
                      className="flex justify-between gap-3 text-xs text-white/45"
                      key={line.id}
                    >
                      <span>{line.label}</span>
                      <span>{formatMoneyCents(line.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {estimate.requestAdjustments.map((line) => (
              <div className="flex justify-between gap-3 px-3 py-3 text-sm" key={line.id}>
                <span className="text-white/75">{line.label}</span>
                <span>{formatMoneyCents(line.amountCents)}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-white/45">
            Calculado em {formatDate(estimate.calculatedAt)}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/50">Sem memoria de calculo.</p>
      )}
    </section>
  );
}

function CompanyRevisionTimeline({
  quoteRequest,
}: {
  quoteRequest: CompanyQuoteRequestDetail;
}) {
  return (
    <section>
      <h3 className="text-lg font-semibold">Historico</h3>
      <Timeline
        empty="Nenhum evento registrado."
        items={quoteRequest.events.map((event) => ({
          id: event.id,
          title: event.eventType,
          detail:
            event.fromStatus && event.toStatus
              ? `${quoteRequestStatusLabels[event.fromStatus]} -> ${
                  quoteRequestStatusLabels[event.toStatus]
                }`
              : "Evento",
          date: event.createdAt,
        }))}
      />
      {quoteRequest.revisions.length > 0 ? (
        <div className="mt-5 divide-y divide-white/10 rounded-md border border-white/10">
          {quoteRequest.revisions.map((revision) => (
            <div className="px-3 py-3 text-sm" key={revision.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-white/85">{revision.fieldCode}</span>
                <span
                  className={
                    revision.impactCents && revision.impactCents < 0
                      ? "text-rose-200"
                      : "text-emerald-200"
                  }
                >
                  {revision.impactCents === null
                    ? "Sem impacto"
                    : formatMoneyCents(revision.impactCents)}
                </span>
              </div>
              <div className="mt-1 text-xs text-white/45">
                {revision.reason ?? "Sem motivo informado"} -{" "}
                {formatDate(revision.createdAt)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
