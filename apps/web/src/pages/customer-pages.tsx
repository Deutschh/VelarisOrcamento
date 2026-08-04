import { PUBLIC_COMPANY_CATEGORIES } from "@velaris/shared";
import type {
  AppointmentStatus,
  CustomerAppointmentSummary,
  CustomerCompanySummary,
  CustomerDashboardResponse,
  CustomerLinkVisitorRequestsResponse,
  CustomerPendingReviewSummary,
  CustomerProposalSummary,
  CustomerQuoteRequestSummary,
  CustomerRemoveFavoriteResponse,
  QuoteRequestStatus,
  QuoteVersionStatus,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  Heart,
  History,
  Link2,
  MessageSquareText,
  Star,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  ActionButton,
  AppShell,
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  PrimaryLink,
  SectionTitle,
} from "../components/ui.js";
import {
  QuoteRequestStatusBadge,
  proposalVersionStatusLabels,
} from "../components/status-badges.js";
import { ApiError, apiRequest, errorMessage } from "../lib/api.js";
import {
  formatDate,
  formatDurationMinutes,
  formatMoneyCents,
} from "../lib/formatters.js";

export function CustomerAreaPage() {
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["customer-dashboard"],
    queryFn: () => apiRequest<CustomerDashboardResponse>("/api/customer/me"),
    retry: false,
  });
  const linkMutation = useMutation({
    mutationFn: () =>
      apiRequest<CustomerLinkVisitorRequestsResponse>(
        "/api/customer/link-visitor-requests",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
    onSuccess(response) {
      queryClient.setQueryData(["customer-dashboard"], response.dashboard);
    },
  });
  const removeFavoriteMutation = useMutation({
    mutationFn: (companyId: string) =>
      apiRequest<CustomerRemoveFavoriteResponse>(`/api/customer/favorites/${companyId}`, {
        method: "DELETE",
      }),
    onSuccess(response) {
      queryClient.setQueryData(["customer-dashboard"], response.dashboard);
      void queryClient.invalidateQueries({ queryKey: ["public-company"] });
      void queryClient.invalidateQueries({ queryKey: ["public-companies"] });
    },
  });
  const dashboard = dashboardQuery.data;
  const activeRequests = dashboard?.requests.filter(isActiveRequest) ?? [];
  const pendingProposals = dashboard?.proposals.filter(isPendingProposal) ?? [];
  const upcomingAppointments =
    dashboard?.appointments.filter(isUpcomingAppointment) ?? [];
  const authError =
    dashboardQuery.error instanceof ApiError &&
    (dashboardQuery.error.status === 401 || dashboardQuery.error.status === 403);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Cliente" title="Minha area" />
          {authError ? (
            <PrimaryLink icon={Link2} to="/login">
              Entrar
            </PrimaryLink>
          ) : null}
        </div>

        {dashboardQuery.isLoading ? <LoadingLine /> : null}
        {dashboardQuery.error ? (
          <ErrorPanel
            error={dashboardQuery.error}
            fallback="Nao foi possivel carregar a area do cliente."
          />
        ) : null}

        {dashboard ? (
          <div className="mt-6 space-y-6">
            <section className="grid gap-3 md:grid-cols-4">
              <InfoBlock label="Em andamento" value={String(activeRequests.length)} />
              <InfoBlock
                label="Propostas aguardando"
                value={String(pendingProposals.length)}
              />
              <InfoBlock
                label="Proximos horarios"
                value={String(upcomingAppointments.length)}
              />
              <InfoBlock
                label="Avaliacoes pendentes"
                value={String(dashboard.pendingReviews.length)}
              />
            </section>

            <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Vincular historico</h2>
                  <p className="mt-1 text-sm text-white/55">
                    Busca solicitacoes antigas com o mesmo e-mail verificado da sua conta.
                  </p>
                </div>
                <ActionButton
                  icon={Link2}
                  isLoading={linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                >
                  Vincular
                </ActionButton>
              </div>
              {linkMutation.data ? (
                <p className="mt-3 text-sm text-emerald-100">
                  {linkMutation.data.linkedRequestsCount} solicitacao(oes) vinculada(s).
                </p>
              ) : null}
              <FormError
                message={
                  linkMutation.error
                    ? errorMessage(
                        linkMutation.error,
                        "Nao foi possivel vincular solicitacoes.",
                      )
                    : null
                }
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <section className="space-y-6">
                <CustomerSection
                  empty="Nenhuma solicitacao vinculada a sua conta."
                  icon={MessageSquareText}
                  title="Solicitacoes em andamento"
                >
                  {activeRequests.slice(0, 8).map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma proposta aguardando sua confirmacao."
                  icon={Star}
                  title="Propostas aguardando confirmacao"
                >
                  {pendingProposals.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhum proximo agendamento."
                  icon={CalendarClock}
                  title="Proximos agendamentos"
                >
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard appointment={appointment} key={appointment.id} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhum historico vinculado a sua conta."
                  icon={History}
                  title="Historico"
                >
                  {dashboard.history.slice(0, 12).map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </CustomerSection>
              </section>

              <aside className="space-y-6">
                <CustomerSection
                  empty="Nenhuma categoria disponivel."
                  icon={Building2}
                  title="Empresas e categorias"
                >
                  <Link
                    className="flex items-center justify-between rounded-md border border-white/10 bg-[#12141a] px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                    to="/empresas"
                  >
                    <span>Empresas proximas</span>
                    <ArrowRight size={16} />
                  </Link>
                  {PUBLIC_COMPANY_CATEGORIES.map((category) => (
                    <Link
                      className="flex items-center justify-between rounded-md border border-white/10 bg-[#12141a] px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                      key={category.code}
                      to={`/empresas?category=${category.code}`}
                    >
                      <span>{category.label}</span>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma avaliacao pendente."
                  icon={Star}
                  title="Avaliacoes pendentes"
                >
                  {dashboard.pendingReviews.map((review) => (
                    <PendingReviewCard key={review.appointmentId} review={review} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma empresa favorita."
                  icon={Heart}
                  title="Favoritos"
                >
                  {dashboard.favorites.map((company) => (
                    <CompanyMiniCard
                      action={
                        <button
                          className="rounded-md border border-white/10 p-2 text-white/55 hover:bg-white/10 hover:text-white"
                          type="button"
                          onClick={() => removeFavoriteMutation.mutate(company.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      }
                      company={company}
                      key={company.id}
                    />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma empresa recente."
                  icon={History}
                  title="Empresas recentes"
                >
                  {dashboard.recentCompanies.map((company) => (
                    <CompanyMiniCard company={company} key={company.id} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma notificacao."
                  icon={Bell}
                  title="Notificacoes"
                >
                  {dashboard.notifications.map((notification) => (
                    <div
                      className="rounded-md border border-white/10 bg-white/[0.03] p-4"
                      key={notification.id}
                    >
                      <p className="font-medium text-white/85">{notification.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/55">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-white/35">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  ))}
                </CustomerSection>
              </aside>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}

function CustomerSection({
  children,
  empty,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  empty: string;
  icon: LucideIcon;
  title: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Icon className="text-emerald-200" size={20} />
        {title}
      </h2>
      <div className="mt-4 space-y-3">
        {isEmpty ? <p className="text-sm text-white/50">{empty}</p> : children}
      </div>
    </section>
  );
}

function RequestCard({ request }: { request: CustomerQuoteRequestSummary }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-200">{request.company.tradingName}</p>
          <h3 className="mt-1 font-medium">{request.serviceName}</h3>
          <p className="mt-1 text-xs text-white/45">Codigo {request.requestCode}</p>
        </div>
        <QuoteRequestStatusBadge status={request.status} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoBlock label="Itens" value={String(request.itemCount)} />
        <InfoBlock
          label="Estimativa"
          value={
            request.estimateMinCents !== null && request.estimateMaxCents !== null
              ? `${formatMoneyCents(request.estimateMinCents)} a ${formatMoneyCents(
                  request.estimateMaxCents,
                )}`
              : "Pendente"
          }
        />
        <InfoBlock label="Atualizado" value={formatDate(request.updatedAt)} />
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: CustomerProposalSummary }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-200">{proposal.company.tradingName}</p>
          <h3 className="mt-1 font-medium">
            {proposal.latestProposalCode ?? "Proposta"}
          </h3>
          <p className="mt-1 text-xs text-white/45">Solicitacao {proposal.requestCode}</p>
        </div>
        <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/65">
          {proposal.latestVersionStatus
            ? proposalVersionStatusLabels[proposal.latestVersionStatus]
            : "Pendente"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoBlock
          label="Valor"
          value={
            proposal.finalTotalCents !== null
              ? formatMoneyCents(proposal.finalTotalCents)
              : "Pendente"
          }
        />
        <InfoBlock
          label="Validade"
          value={proposal.validUntil ? formatDate(proposal.validUntil) : "Pendente"}
        />
        <InfoBlock label="Atualizada" value={formatDate(proposal.updatedAt)} />
      </div>
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: CustomerAppointmentSummary }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-200">{appointment.company.tradingName}</p>
          <h3 className="mt-1 font-medium">{appointment.serviceName}</h3>
          <p className="mt-1 text-xs text-white/45">{formatDate(appointment.startsAt)}</p>
        </div>
        <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/65">
          {appointment.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoBlock
          label="Duracao"
          value={formatDurationMinutes(appointment.durationMinutes)}
        />
        <InfoBlock label="Servico" value={appointment.serviceStatus} />
      </div>
      {appointment.address ? (
        <p className="mt-3 text-sm text-white/55">{appointment.address}</p>
      ) : null}
    </div>
  );
}

function PendingReviewCard({ review }: { review: CustomerPendingReviewSummary }) {
  return (
    <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-4">
      <p className="font-medium text-emerald-50">{review.company.tradingName}</p>
      <p className="mt-1 text-sm text-emerald-100/80">{review.serviceName}</p>
      <p className="mt-2 text-xs text-emerald-100/60">
        Avalie pelo acompanhamento publico da solicitacao {review.requestCode}.
      </p>
    </div>
  );
}

function CompanyMiniCard({
  action,
  company,
}: {
  action?: ReactNode;
  company: CustomerCompanySummary;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#12141a] p-3">
      <Link className="flex min-w-0 items-center gap-3" to={`/empresa/${company.slug}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-emerald-200">
          {company.logoUrl ? (
            <img
              alt=""
              className="h-full w-full rounded-md object-cover"
              src={company.logoUrl}
            />
          ) : (
            <Building2 size={18} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{company.tradingName}</p>
          <p className="mt-1 truncate text-xs text-white/45">
            {[company.city, company.state].filter(Boolean).join(", ") ||
              company.nicheLabel}
          </p>
        </div>
      </Link>
      {action}
    </div>
  );
}

function isActiveRequest(request: CustomerQuoteRequestSummary) {
  const terminalStatuses: QuoteRequestStatus[] = [
    "declined_by_company",
    "cancelled",
    "archived",
  ];

  return !terminalStatuses.includes(request.status);
}

function isPendingProposal(proposal: CustomerProposalSummary) {
  const pendingStatuses: QuoteVersionStatus[] = ["sent", "viewed"];

  return proposal.latestVersionStatus
    ? pendingStatuses.includes(proposal.latestVersionStatus)
    : false;
}

function isUpcomingAppointment(appointment: CustomerAppointmentSummary) {
  const upcomingStatuses: AppointmentStatus[] = [
    "proposed",
    "confirmed",
    "reschedule_requested",
    "rescheduled",
  ];

  return upcomingStatuses.includes(appointment.status);
}
