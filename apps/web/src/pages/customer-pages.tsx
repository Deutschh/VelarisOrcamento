import {
  PUBLIC_COMPANY_CATEGORIES,
  customerProfileUpdateRequestSchema,
} from "@velaris/shared";
import type {
  AppointmentStatus,
  CustomerAppointmentSummary,
  CustomerCompanySummary,
  CustomerDashboardResponse,
  CustomerLinkVisitorRequestsResponse,
  CustomerPendingReviewSummary,
  CustomerProfileResponse,
  CustomerProfileUpdateRequest,
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
  Image,
  Link2,
  MessageSquareText,
  Save,
  Star,
  Trash2,
  UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
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
  SubmitButton,
  TextField,
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
import { formatBrazilianPhoneInput } from "../lib/input-formatters.js";
import { useSession } from "../lib/session.js";

interface CustomerProfileFormValues {
  name: string;
  phone: string;
  avatarUrl: string;
}

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
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Cliente" title="Sua área de acompanhamento." />
          {authError ? (
            <PrimaryLink icon={Link2} to="/login">
              Entrar
            </PrimaryLink>
          ) : dashboard ? (
            <PrimaryLink icon={UserCircle} to="/cliente/perfil">
              Meu perfil
            </PrimaryLink>
          ) : null}
        </div>

        {dashboardQuery.isLoading ? <LoadingLine /> : null}

        {dashboardQuery.error ? (
          <ErrorPanel
            error={dashboardQuery.error}
            fallback="Não foi possível carregar a área do cliente."
          />
        ) : null}

        {dashboard ? (
          <div className="mt-7 space-y-6">
            <section className="grid gap-3 md:grid-cols-4">
              <InfoBlock label="Em andamento" value={String(activeRequests.length)} />
              <InfoBlock
                label="Propostas aguardando"
                value={String(pendingProposals.length)}
              />
              <InfoBlock
                label="Próximos horários"
                value={String(upcomingAppointments.length)}
              />
              <InfoBlock
                label="Avaliações pendentes"
                value={String(dashboard.pendingReviews.length)}
              />
            </section>

            <section className="relative overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
              <div className="absolute right-[-90px] top-[-90px] h-48 w-48 rounded-full bg-[var(--color-accent-soft)] blur-[80px]" />

              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    Histórico
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
                    Vincular solicitações antigas
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
                    Busque solicitações feitas como visitante usando o mesmo e-mail
                    verificado da sua conta.
                  </p>
                </div>

                <ActionButton
                  icon={Link2}
                  isLoading={linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                >
                  Vincular histórico
                </ActionButton>
              </div>

              {linkMutation.data ? (
                <p className="relative mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  {linkMutation.data.linkedRequestsCount} solicitação(ões) vinculada(s).
                </p>
              ) : null}

              <FormError
                message={
                  linkMutation.error
                    ? errorMessage(
                        linkMutation.error,
                        "Não foi possível vincular solicitações.",
                      )
                    : null
                }
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <section className="space-y-6">
                <CustomerSection
                  empty="Nenhuma solicitação vinculada à sua conta."
                  icon={MessageSquareText}
                  title="Solicitações em andamento"
                >
                  {activeRequests.slice(0, 8).map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma proposta aguardando sua confirmação."
                  icon={Star}
                  title="Propostas aguardando confirmação"
                >
                  {pendingProposals.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhum próximo agendamento."
                  icon={CalendarClock}
                  title="Próximos agendamentos"
                >
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard appointment={appointment} key={appointment.id} />
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhum histórico vinculado à sua conta."
                  icon={History}
                  title="Histórico"
                >
                  {dashboard.history.slice(0, 12).map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </CustomerSection>
              </section>

              <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
                <CustomerSection
                  empty="Nenhuma categoria disponível."
                  icon={Building2}
                  title="Empresas e categorias"
                >
                  <Link
                    className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                    to="/empresas"
                  >
                    <span>Empresas próximas</span>
                    <ArrowRight
                      className="transition group-hover:translate-x-1"
                      size={16}
                    />
                  </Link>

                  {PUBLIC_COMPANY_CATEGORIES.map((category) => (
                    <Link
                      className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                      key={category.code}
                      to={`/empresas?category=${category.code}`}
                    >
                      <span>{category.label}</span>
                      <ArrowRight
                        className="transition group-hover:translate-x-1"
                        size={16}
                      />
                    </Link>
                  ))}
                </CustomerSection>

                <CustomerSection
                  empty="Nenhuma avaliação pendente."
                  icon={Star}
                  title="Avaliações pendentes"
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
                          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:border-rose-300/30 hover:bg-rose-300/10 hover:text-rose-200"
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
                  empty="Nenhuma notificação."
                  icon={Bell}
                  title="Notificações"
                >
                  {dashboard.notifications.map((notification) => (
                    <div
                      className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5"
                      key={notification.id}
                    >
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {notification.title}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                        {notification.message}
                      </p>
                      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
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

export function CustomerProfilePage() {
  const queryClient = useQueryClient();
  const session = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => apiRequest<CustomerProfileResponse>("/api/customer/profile"),
    retry: false,
  });
  const { handleSubmit, register, reset, watch } = useForm<CustomerProfileFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      avatarUrl: "",
    },
  });
  const avatarUrl = watch("avatarUrl");
  const profile = profileQuery.data?.profile;
  const authError =
    profileQuery.error instanceof ApiError &&
    (profileQuery.error.status === 401 || profileQuery.error.status === 403);
  const profileMutation = useMutation({
    mutationFn: (payload: CustomerProfileUpdateRequest) =>
      apiRequest<CustomerProfileResponse>("/api/customer/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess(response) {
      setFormError(null);
      queryClient.setQueryData(["customer-profile"], response);
      void queryClient.invalidateQueries({ queryKey: ["customer-dashboard"] });

      if (session.status === "authenticated" && session.user) {
        session.setAuthenticatedUser({
          ...session.user,
          name: response.profile.name,
        });
      }
    },
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    reset({
      name: profile.name,
      phone: profile.phone ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    });
  }, [profile, reset]);

  function submit(values: CustomerProfileFormValues) {
    setFormError(null);
    const parsed = customerProfileUpdateRequestSchema.safeParse({
      name: values.name,
      phone: emptyToUndefined(values.phone),
      avatarUrl: emptyToUndefined(values.avatarUrl),
    });

    if (!parsed.success) {
      setFormError(formatProfileValidationError(parsed.error.issues[0]?.message));
      return;
    }

    profileMutation.mutate(parsed.data);
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Cliente" title="Seu perfil." />
          {authError ? (
            <PrimaryLink icon={Link2} to="/login">
              Entrar
            </PrimaryLink>
          ) : (
            <PrimaryLink icon={ArrowRight} to="/cliente">
              Área do cliente
            </PrimaryLink>
          )}
        </div>

        {profileQuery.isLoading ? <LoadingLine /> : null}

        {profileQuery.error ? (
          <ErrorPanel
            error={profileQuery.error}
            fallback="Não foi possível carregar seu perfil."
          />
        ) : null}

        {profile ? (
          <div className="mt-7 grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="relative overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
              <div className="absolute right-[-80px] top-[-80px] h-44 w-44 rounded-full bg-[var(--color-accent-soft)] blur-[80px]" />

              <div className="relative mx-auto grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
                {avatarUrl ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    key={avatarUrl}
                    src={avatarUrl}
                  />
                ) : (
                  <UserCircle size={64} />
                )}
              </div>

              <div className="relative mt-6 text-center">
                <h2 className="font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
                  {profile.name}
                </h2>
                <p className="mt-2 break-words text-sm text-[var(--color-text-secondary)]">
                  {profile.email}
                </p>
                <p className="mt-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                  {profile.isEmailVerified ? "E-mail verificado" : "E-mail pendente"}
                </p>
              </div>
            </aside>

            <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                  <Image size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    Dados pessoais
                  </p>
                  <h2 className="mt-1 font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
                    Informações do cliente
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Esses dados ajudam a identificar suas solicitações e contatos.
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit(submit)}>
                <TextField
                  label="Nome"
                  placeholder="Ex: Guilherme Andrade"
                  required
                  {...register("name")}
                />

                <TextField disabled label="E-mail" readOnly value={profile.email} />

                <TextField
                  inputMode="tel"
                  label="Telefone"
                  placeholder="Ex: (11) 98147-9715"
                  {...register("phone", {
                    onChange: (event) => {
                      event.target.value = formatBrazilianPhoneInput(event.target.value);
                    },
                  })}
                />

                <TextField
                  inputMode="url"
                  label="URL da foto"
                  placeholder="Ex: https://seudominio.com/foto.jpg"
                  {...register("avatarUrl")}
                />

                <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm leading-7 text-[var(--color-text-secondary)]">
                  Por enquanto, a foto do perfil usa uma URL pública. O envio direto de
                  arquivo será conectado quando o armazenamento privado do projeto for
                  fechado.
                </div>

                <SubmitButton icon={Save} isLoading={profileMutation.isPending}>
                  Salvar perfil
                </SubmitButton>

                {profileMutation.isSuccess ? (
                  <p className="mt-3 rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
                    Perfil atualizado com sucesso.
                  </p>
                ) : null}

                <FormError
                  message={
                    formError ??
                    (profileMutation.error
                      ? errorMessage(
                          profileMutation.error,
                          "Não foi possível salvar seu perfil.",
                        )
                      : null)
                  }
                />
              </form>
            </section>
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
    <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
          <Icon size={18} />
        </div>
        <h2 className="font-serif text-2xl font-normal tracking-[-0.04em] text-[var(--color-text-primary)]">
          {title}
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {isEmpty ? (
          <p className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
            {empty}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function RequestCard({ request }: { request: CustomerQuoteRequestSummary }) {
  return (
    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            {request.company.tradingName}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">
            {request.serviceName}
          </h3>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Código {request.requestCode}
          </p>
        </div>

        <QuoteRequestStatusBadge status={request.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            {proposal.company.tradingName}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">
            {proposal.latestProposalCode ?? "Proposta"}
          </h3>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Solicitação {proposal.requestCode}
          </p>
        </div>

        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
          {proposal.latestVersionStatus
            ? proposalVersionStatusLabels[proposal.latestVersionStatus]
            : "Pendente"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            {appointment.company.tradingName}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">
            {appointment.serviceName}
          </h3>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {formatDate(appointment.startsAt)}
          </p>
        </div>

        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
          {appointment.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoBlock
          label="Duração"
          value={formatDurationMinutes(appointment.durationMinutes)}
        />
        <InfoBlock label="Serviço" value={appointment.serviceStatus} />
      </div>

      {appointment.address ? (
        <p className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          {appointment.address}
        </p>
      ) : null}
    </div>
  );
}

function PendingReviewCard({ review }: { review: CustomerPendingReviewSummary }) {
  return (
    <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
      <p className="font-semibold text-[var(--color-text-primary)]">
        {review.company.tradingName}
      </p>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {review.serviceName}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
        Avalie pelo acompanhamento público da solicitação {review.requestCode}.
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
    <div className="flex items-center justify-between gap-3 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 transition hover:bg-[var(--color-surface-strong)]">
      <Link className="flex min-w-0 items-center gap-3" to={`/empresa/${company.slug}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
          {company.logoUrl ? (
            <img alt="" className="h-full w-full object-cover" src={company.logoUrl} />
          ) : (
            <Building2 size={18} />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {company.tradingName}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
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

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatProfileValidationError(message?: string) {
  return message ? `Revise o perfil: ${message}` : "Revise os dados do perfil.";
}
