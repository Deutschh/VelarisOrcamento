import {
  PUBLIC_COMPANY_CATEGORIES,
  createQuoteDraftRequestSchema,
  customerFavoriteCompanyRequestSchema,
  customerAppointmentActionRequestSchema,
  publicCompanySearchQuerySchema,
  publicTrackingRecoveryRequestSchema,
  publicTrackingRecoveryVerifyRequestSchema,
  publicReviewCreateRequestSchema,
  quoteDraftFileMetadataRequestSchema,
  submitQuoteDraftRequestSchema,
  updateQuoteDraftRequestSchema,
  publicProposalAcceptRequestSchema,
  publicProposalRejectRequestSchema,
} from "@velaris/shared";
import type {
  CompanyAppointment,
  CreateQuoteDraftResponse,
  CustomerFavoriteResponse,
  PublicCompanyCategoryCode,
  PublicCompanyDetail,
  PublicCompanySummary,
  PublicTrackingAppointmentActionResponse,
  PublicTrackingRecoveryRequestResponse,
  PublicTrackingRecoveryVerifyResponse,
  PublicTrackingResponse,
  QuoteDraftData,
  QuoteDraftDetail,
  QuoteDraftItem,
  QuoteDraftResponse,
  QuoteEstimateResponse,
  QuoteSubmitResponse,
  PublicProposalDetail,
  PublicProposalRejectRequest,
  PublicReviewCreateResponse,
  PublicTrackingProposalActionResponse,
  PublicTrackingProposalDetailResponse,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Copy,
  KeyRound,
  LocateFixed,
  MapPin,
  MessageCircle,
  PlusCircle,
  RefreshCcw,
  Save,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  Upload,
  FileText,
  Heart,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { CheckboxField, SelectField } from "../components/form-controls.js";
import {
  ActionButton,
  AppShell,
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  PrimaryLink,
  RequiredFieldsLegend,
  RequiredLabel,
  SecondaryLink,
  SectionTitle,
  SubmitButton,
  TextAreaField,
  TextField,
} from "../components/ui.js";
import {
  AppointmentStatusBadge,
  QuoteRequestStatusBadge,
  proposalVersionStatusLabels,
} from "../components/status-badges.js";
import {
  ApiError,
  apiRequest,
  apiUrl,
  createIdempotencyHeaders,
  errorMessage,
} from "../lib/api.js";
import {
  formatAppointmentWindow,
  formatDate,
  formatDurationMinutes,
  formatMoneyCents,
  formatQuoteAddress,
  getLatestAppointment,
} from "../lib/formatters.js";
import {
  cleaningSimulationSelectOptions,
  fieldOptions,
  isQuoteFieldRequired,
  isQuoteItemFieldVisible,
  parseIntegerInput,
  parseNumberInput,
} from "../lib/quote-form-options.js";
import { formatBrazilianPhoneInput } from "../lib/input-formatters.js";
import { useSession } from "../lib/session.js";
async function fetchPublicCompanies(input: {
  category?: PublicCompanyCategoryCode;
  location?: string;
}) {
  const parsed = publicCompanySearchQuerySchema.parse({
    ...(input.category ? { category: input.category } : {}),
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
  });
  const search = new URLSearchParams();

  if (parsed.category) {
    search.set("category", parsed.category);
  }

  if (parsed.location) {
    search.set("location", parsed.location);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<{ companies: PublicCompanySummary[] }>(
    `/api/public/companies${suffix}`,
  );
}

export function HomePage() {
  const session = useSession();

  if (session.status === "loading") {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <LoadingLine />
        </main>
      </AppShell>
    );
  }

  if (session.user?.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  if (session.user?.role === "company") {
    return <Navigate replace to="/app" />;
  }

  if (session.user?.role === "customer") {
    return <Navigate replace to="/servicos" />;
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <section className="grid min-h-[calc(100vh-132px)] items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)] backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" />
              Velaris Orçamentos
            </p>

            <h1 className="mt-7 max-w-4xl font-serif text-[46px] font-normal leading-[0.94] tracking-[-0.055em] text-[var(--color-text-primary)] sm:text-[68px] lg:text-[86px]">
              Orçamentos de serviços com caminho claro para clientes e empresas.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
              Clientes encontram empresas, enviam fotos e acompanham propostas. Empresas
              recebem solicitações organizadas, revisam dados e conduzem o atendimento em
              um só lugar.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryLink icon={Search} to="/login?perfil=cliente">
                Procurar serviços
              </PrimaryLink>
              <SecondaryLink icon={Building2} to="/cadastro/empresa">
                Cadastrar empresa
              </SecondaryLink>
              <SecondaryLink icon={ArrowRight} to="/servicos">
                Continuar como visitante
              </SecondaryLink>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                Fluxo inicial
              </p>
              <div className="mt-7 space-y-4">
                {[
                  [
                    "01",
                    "Cliente escolhe o caminho",
                    "Pode criar conta para ter área do cliente ou seguir como visitante.",
                  ],
                  [
                    "02",
                    "Pedido nasce com fotos",
                    "A solicitação chega à empresa com dados e anexos para análise.",
                  ],
                  [
                    "03",
                    "Empresa revisa e envia proposta",
                    "O cliente acompanha status, proposta, horário e decisão pelo sistema.",
                  ],
                ].map(([number, title, body]) => (
                  <div
                    className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5"
                    key={number}
                  >
                    <p className="font-serif text-3xl text-[var(--color-text-muted)]">
                      {number}
                    </p>
                    <h2 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

export function ServiceDiscoveryPage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [category, setCategory] =
    useState<PublicCompanyCategoryCode>("cleaning_upholstery");
  const companiesQuery = useQuery({
    queryKey: ["public-companies-home"],
    queryFn: () => fetchPublicCompanies({ category: "cleaning_upholstery" }),
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = new URLSearchParams();
    search.set("category", category);

    if (location.trim()) {
      search.set("location", location.trim());
    }

    navigate(`/empresas?${search.toString()}`);
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <section className="grid min-h-[calc(100vh-132px)] items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)] backdrop-blur-xl">
              <Search className="h-3.5 w-3.5" />
              Orçamentos com clareza
            </p>

            <h1 className="mt-7 max-w-4xl font-serif text-[48px] font-normal leading-[0.92] tracking-[-0.065em] text-[var(--color-text-primary)] sm:text-[72px] lg:text-[92px]">
              Encontre a empresa certa.
              <span className="block text-[var(--color-text-muted)]">
                Peça seu orçamento sem complicação.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
              Escolha o serviço, informe os detalhes e acompanhe tudo pelo mesmo link:
              estimativa, proposta, horário e confirmação.
            </p>

            <form
              className="mt-9 grid gap-3 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:grid-cols-[220px_1fr_auto]"
              onSubmit={submitSearch}
            >
              <select
                className="min-h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-border-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as PublicCompanyCategoryCode)
                }
              >
                {PUBLIC_COMPANY_CATEGORIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                className="min-h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
                placeholder="Cidade, bairro ou CEP"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
                type="submit"
              >
                <Search size={18} />
                Buscar
              </button>
            </form>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                [
                  "01",
                  "Descreva o serviço",
                  "Responda apenas o necessário para a empresa entender o pedido.",
                ],
                [
                  "02",
                  "Receba a proposta",
                  "A empresa revisa os dados e envia o valor final.",
                ],
                [
                  "03",
                  "Confirme pelo link",
                  "Aceite, recuse ou fale pelo WhatsApp sem perder o histórico.",
                ],
              ].map(([number, title, body]) => (
                <div
                  className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl"
                  key={number}
                >
                  <p className="font-serif text-3xl text-[var(--color-text-muted)]">
                    {number}
                  </p>
                  <h3 className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
            <div className="absolute right-[-80px] top-[-80px] h-48 w-48 rounded-full bg-[var(--color-accent-soft)] blur-[70px]" />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                Categorias
              </p>
              <h2 className="mt-4 font-serif text-4xl font-normal tracking-[-0.05em]">
                Comece pelo que você precisa.
              </h2>
              <div className="mt-7 grid gap-3">
                {PUBLIC_COMPANY_CATEGORIES.map((item) => (
                  <Link
                    className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-4 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                    key={item.code}
                    to={`/empresas?category=${item.code}`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight
                      className="transition group-hover:translate-x-1"
                      size={16}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="border-t border-[var(--color-border)] py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow="Descoberta" title="Empresas publicadas" />
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
              to="/empresas"
            >
              Ver busca completa
              <ArrowRight size={16} />
            </Link>
          </div>

          {companiesQuery.isLoading ? <LoadingLine /> : null}
          {companiesQuery.error ? (
            <ErrorPanel
              error={companiesQuery.error}
              fallback="Não foi possível carregar as empresas agora."
            />
          ) : null}
          {companiesQuery.data ? (
            <CompanyGrid companies={companiesQuery.data.companies.slice(0, 6)} />
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}

export function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    {
      title: "Encontre uma empresa",
      body: "Escolha o serviço e veja empresas publicadas que atendem sua região.",
    },
    {
      title: "Explique o que precisa",
      body: "Preencha os detalhes, adicione fotos e gere uma estimativa inicial.",
    },
    {
      title: "Acompanhe até a decisão",
      body: "Receba a proposta final, confirme o valor e combine o atendimento pelo mesmo link.",
    },
  ];
  const step = steps[stepIndex] ?? steps[0]!;

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionTitle
          eyebrow="Primeiro acesso"
          title="Uma jornada simples para pedir orçamento."
        />

        <section className="mt-8 overflow-hidden rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8">
          <div className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            0{stepIndex + 1} / 03
          </div>
          <h2 className="mt-6 max-w-3xl font-serif text-5xl font-normal leading-[0.95] tracking-[-0.055em]">
            {step.title}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
            {step.body}
          </p>
        </section>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <button
              className={`rounded-[28px] border p-5 text-left text-sm transition ${
                index === stepIndex
                  ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]"
              }`}
              key={step.title}
              type="button"
              onClick={() => setStepIndex(index)}
            >
              <span className="font-serif text-3xl">0{index + 1}</span>
              <span className="mt-4 block font-semibold">{step.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {stepIndex < steps.length - 1 ? (
            <button
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
              type="button"
              onClick={() => setStepIndex((current) => current + 1)}
            >
              Continuar
              <ArrowRight size={18} />
            </button>
          ) : (
            <PrimaryLink icon={Search} to="/empresas">
              Começar busca
            </PrimaryLink>
          )}
          <SecondaryLink icon={ArrowRight} to="/">
            Voltar ao início
          </SecondaryLink>
        </div>
      </main>
    </AppShell>
  );
}

export function CompaniesSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<PublicCompanyCategoryCode>(
    (searchParams.get("category") as PublicCompanyCategoryCode | null) ??
      "cleaning_upholstery",
  );
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const companiesQuery = useQuery({
    queryKey: ["public-companies", searchParams.toString()],
    queryFn: () => {
      const categoryParam = searchParams.get(
        "category",
      ) as PublicCompanyCategoryCode | null;
      const locationParam = searchParams.get("location");

      return fetchPublicCompanies({
        ...(categoryParam ? { category: categoryParam } : {}),
        ...(locationParam ? { location: locationParam } : {}),
      });
    },
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    next.set("category", category);

    if (location.trim()) {
      next.set("location", location.trim());
    }

    setSearchParams(next);
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionTitle
            eyebrow="Busca"
            title="Encontre empresas disponíveis para seu pedido."
          />
          <p className="max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] lg:justify-self-end">
            Filtre por categoria e região para encontrar empresas que já possuem perfil
            publicado na Velaris.
          </p>
        </div>

        <form
          className="mt-8 grid gap-3 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:grid-cols-[240px_1fr_auto]"
          onSubmit={submitSearch}
        >
          <select
            className="min-h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-border-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as PublicCompanyCategoryCode)
            }
          >
            {PUBLIC_COMPANY_CATEGORIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            className="min-h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
            placeholder="Cidade, bairro ou CEP"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />

          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
            type="submit"
          >
            <Search size={18} />
            Buscar
          </button>
        </form>

        {companiesQuery.isLoading ? <LoadingLine /> : null}
        {companiesQuery.error ? (
          <ErrorPanel
            error={companiesQuery.error}
            fallback="Não foi possível carregar as empresas agora."
          />
        ) : null}
        {companiesQuery.data ? (
          <CompanyGrid companies={companiesQuery.data.companies} />
        ) : null}
      </main>
    </AppShell>
  );
}

export function PublicCompanyProfilePage() {
  const { slug } = useParams();
  const companyQuery = useQuery({
    enabled: Boolean(slug),
    queryKey: ["public-company", slug],
    queryFn: () =>
      apiRequest<{ company: PublicCompanyDetail }>(
        `/api/public/companies/${String(slug)}`,
      ),
  });
  const company = companyQuery.data?.company;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {companyQuery.isLoading ? <LoadingLine /> : null}
        {companyQuery.error ? (
          <ErrorPanel error={companyQuery.error} fallback="Empresa nao encontrada." />
        ) : null}
        {company ? <PublicCompanyProfile company={company} /> : null}
      </main>
    </AppShell>
  );
}

export function QuoteRequestPage() {
  const { slug } = useParams();
  const [draftEnvelope, setDraftEnvelope] = useState<{
    draftToken: string;
    draft: QuoteDraftDetail;
  } | null>(null);
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);
  const [submitResult, setSubmitResult] = useState<QuoteSubmitResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fileFeedbackByItem, setFileFeedbackByItem] = useState<Record<string, string>>(
    {},
  );
  const draftQuery = useQuery({
    enabled: Boolean(slug),
    queryKey: ["public-quote-draft", slug],
    queryFn: () => initializeQuoteDraft(String(slug)),
    retry: false,
  });

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setDraftEnvelope(draftQuery.data);
    setDraftData(draftQuery.data.draft.data);
    persistQuoteDraftToken(String(slug), {
      draftToken: draftQuery.data.draftToken,
      companySlug: String(slug),
      serviceCode: draftQuery.data.draft.service.code,
      currentStep: draftQuery.data.draft.data.currentStep,
      lastActivity: new Date().toISOString(),
    });
  }, [draftQuery.data, slug]);

  const saveMutation = useMutation({
    mutationFn: async (data: QuoteDraftData) => {
      const envelope = requireDraftEnvelope(draftEnvelope);
      const payload = updateQuoteDraftRequestSchema.parse(data);
      return apiRequest<QuoteDraftResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess(response) {
      syncDraft(response.draft);
    },
  });

  const estimateMutation = useMutation({
    mutationFn: async (data: QuoteDraftData) => {
      const envelope = requireDraftEnvelope(draftEnvelope);
      const payload = updateQuoteDraftRequestSchema.parse({
        ...data,
        currentStep: "review",
      });
      const saved = await apiRequest<QuoteDraftResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      syncDraft(saved.draft);

      return apiRequest<QuoteEstimateResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}/estimate`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
    },
    onSuccess(response) {
      syncDraft(response.draft);
    },
  });

  const fileMutation = useMutation({
    mutationFn: async (input: { itemId: string; files: FileList }) => {
      const envelope = requireDraftEnvelope(draftEnvelope);
      let latest: QuoteDraftResponse | null = null;

      for (const file of Array.from(input.files)) {
        const mimeType = resolveQuoteDraftFileMimeType(file);

        if (!mimeType) {
          throw new Error("Formato não suportado. Use JPG, PNG, WEBP ou PDF.");
        }

        const payload = quoteDraftFileMetadataRequestSchema.parse({
          itemId: input.itemId,
          fieldCode: "photos",
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
        });

        latest = await apiRequest<QuoteDraftResponse>(
          `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}/files`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
      }

      if (!latest) {
        throw new Error("Nenhum arquivo selecionado.");
      }

      return latest;
    },
    onMutate(input) {
      setFormError(null);
      setFileFeedbackByItem((current) => ({
        ...current,
        [input.itemId]: "Enviando anexo...",
      }));
    },
    onSuccess(response, input) {
      syncDraft(response.draft);
      setFileFeedbackByItem((current) => ({
        ...current,
        [input.itemId]: `${input.files.length} arquivo(s) anexado(s) agora.`,
      }));
    },
    onError(error, input) {
      const message = errorMessage(error, "Não foi possível anexar o arquivo.");
      setFormError(message);
      setFileFeedbackByItem((current) => ({
        ...current,
        [input.itemId]: message,
      }));
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const envelope = requireDraftEnvelope(draftEnvelope);
      return apiRequest<QuoteDraftResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}/files/${fileId}`,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess(response) {
      syncDraft(response.draft);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: QuoteDraftData) => {
      const envelope = requireDraftEnvelope(draftEnvelope);
      const payload = updateQuoteDraftRequestSchema.parse({
        ...data,
        currentStep: "review",
      });

      await apiRequest<QuoteDraftResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      const submitPayload = submitQuoteDraftRequestSchema.parse({
        acceptedLegalTerms: true,
      });

      return apiRequest<QuoteSubmitResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(envelope.draftToken)}/submit`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(submitPayload),
        },
      );
    },
    onSuccess(response) {
      setSubmitResult(response);
      setDraftData((current) =>
        current
          ? {
              ...current,
              currentStep: "submitted",
            }
          : current,
      );

      if (draftEnvelope) {
        persistQuoteDraftToken(String(slug), {
          draftToken: draftEnvelope.draftToken,
          companySlug: String(slug),
          serviceCode: draftEnvelope.draft.service.code,
          currentStep: "submitted",
          lastActivity: new Date().toISOString(),
        });
      }
    },
  });

  function syncDraft(draft: QuoteDraftDetail) {
    setDraftEnvelope((current) =>
      current
        ? {
            ...current,
            draft,
          }
        : current,
    );
    setDraftData(draft.data);
    persistQuoteDraftToken(String(slug), {
      draftToken: draftEnvelope?.draftToken ?? "",
      companySlug: String(slug),
      serviceCode: draft.service.code,
      currentStep: draft.data.currentStep,
      lastActivity: new Date().toISOString(),
    });
  }

  function updateDraftData(updater: (current: QuoteDraftData) => QuoteDraftData) {
    setDraftData((current) => (current ? updater(current) : current));
  }

  function updateItem(itemId: string, patch: Partial<QuoteDraftItem>) {
    updateDraftData((current) => ({
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

  function addItem(source?: QuoteDraftItem) {
    updateDraftData((current) => {
      const item = createQuoteDraftItem(current.items.length + 1, source);
      return {
        ...current,
        items: [...current.items, item],
      };
    });
  }

  function removeItem(itemId: string) {
    updateDraftData((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((item) => item.id !== itemId),
    }));
  }

  async function saveDraft() {
    if (!draftData) {
      return;
    }

    setFormError(null);

    try {
      await saveMutation.mutateAsync(draftData);
    } catch (error) {
      setFormError(errorMessage(error, "Não foi possível salvar o rascunho."));
    }
  }

  async function estimateDraft() {
    if (!draftData) {
      return;
    }

    setFormError(null);

    try {
      await estimateMutation.mutateAsync(draftData);
    } catch (error) {
      setFormError(errorMessage(error, "Não foi possível calcular a estimativa."));
    }
  }

  async function submitDraft() {
    if (!draftData) {
      return;
    }

    setFormError(null);
    const validationMessage = validateQuoteSubmissionDraft(
      draftData,
      draft?.files.length ?? 0,
    );

    if (validationMessage) {
      setFormError(validationMessage);
      setDraftData({
        ...draftData,
        currentStep:
          validationMessage === "Informe o endereço do atendimento."
            ? "details"
            : validationMessage === "Anexe pelo menos uma foto ou arquivo do serviço."
              ? "items"
              : "contact",
      });
      return;
    }

    try {
      await submitMutation.mutateAsync(draftData);
    } catch (error) {
      setFormError(errorMessage(error, "Não foi possível enviar a solicitação."));
    }
  }

  const draft = draftEnvelope?.draft;
  const estimate = draft?.estimate ?? estimateMutation.data?.estimate ?? null;
  const isBusy =
    saveMutation.isPending ||
    estimateMutation.isPending ||
    submitMutation.isPending ||
    fileMutation.isPending ||
    deleteFileMutation.isPending;

  if (submitResult) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <section className="relative overflow-hidden rounded-[40px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8">
            <div className="absolute right-[-90px] top-[-90px] h-56 w-56 rounded-full bg-[var(--color-accent-soft)] blur-[90px]" />

            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)]">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                    Solicitação enviada
                  </p>
                  <h1 className="mt-1 font-serif text-4xl font-normal tracking-[-0.055em] text-[var(--color-text-primary)]">
                    Agora é só acompanhar.
                  </h1>
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
                A empresa recebeu seu pedido e poderá analisar os detalhes antes de enviar
                uma proposta final. Guarde o link de acompanhamento para consultar tudo em
                um só lugar.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <InfoBlock label="Código" value={submitResult.requestCode} />
                <InfoBlock
                  label="Estimativa inicial"
                  value={`${formatMoneyCents(
                    submitResult.estimate.estimateMinCents,
                  )} a ${formatMoneyCents(submitResult.estimate.estimateMaxCents)}`}
                />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <PrimaryLink icon={ClipboardList} to={submitResult.trackingPath}>
                  Acompanhar solicitação
                </PrimaryLink>
                <SecondaryLink icon={ArrowRight} to={`/empresa/${String(slug)}`}>
                  Voltar ao perfil
                </SecondaryLink>
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(submitResult.trackingPath)}
                >
                  <Copy size={18} />
                  Copiar link
                </button>
              </div>
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {draftQuery.isLoading ? <LoadingLine /> : null}
        {draftQuery.error ? (
          <ErrorPanel
            error={draftQuery.error}
            fallback="Não foi possível iniciar o orçamento."
          />
        ) : null}

        {draft && draftData ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-6">
              <section className="relative overflow-hidden rounded-[38px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8">
                <div className="absolute right-[-100px] top-[-100px] h-56 w-56 rounded-full bg-[var(--color-accent-soft)] blur-[90px]" />

                <div className="relative flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                      {draft.companyName}
                    </p>
                    <h1 className="mt-3 max-w-2xl font-serif text-5xl font-normal leading-[0.95] tracking-[-0.055em] text-[var(--color-text-primary)]">
                      Conte o que precisa para receber uma proposta mais precisa.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
                      Você pode salvar, revisar a estimativa e enviar quando tudo estiver
                      claro. O rascunho expira em {formatDate(draft.expiresAt)}.
                    </p>
                    <RequiredFieldsLegend />
                  </div>

                  <SecondaryLink icon={ArrowRight} to={`/empresa/${String(slug)}`}>
                    Voltar ao perfil
                  </SecondaryLink>
                </div>

                <div className="relative mt-7 grid gap-2 sm:grid-cols-4">
                  {quoteStepItems.map((step, index) => {
                    const isActive = draftData.currentStep === step.code;

                    return (
                      <button
                        className={`rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                        }`}
                        key={step.code}
                        type="button"
                        onClick={() =>
                          updateDraftData((current) => ({
                            ...current,
                            currentStep: step.code,
                          }))
                        }
                      >
                        <span className="block font-serif text-2xl">0{index + 1}</span>
                        <span className="mt-2 block text-sm font-semibold">
                          {step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
                      Itens do orçamento
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      Adicione cada item que precisa de atendimento. Quanto mais claro,
                      melhor a análise da empresa.
                    </p>
                  </div>

                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                    type="button"
                    onClick={() => addItem()}
                  >
                    <PlusCircle size={16} />
                    Adicionar item
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {draftData.items.map((item, index) => (
                    <QuoteItemEditor
                      draft={draft}
                      files={quoteFilesForItem(draft.files, item.id)}
                      index={index}
                      isBusy={isBusy}
                      item={item}
                      key={item.id}
                      uploadFeedback={fileFeedbackByItem[item.id] ?? null}
                      onAddFile={(files) =>
                        fileMutation.mutate({
                          itemId: item.id,
                          files,
                        })
                      }
                      onDuplicate={() => addItem(item)}
                      onRemove={() => removeItem(item.id)}
                      onUpdate={(patch) => updateItem(item.id, patch)}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                <h2 className="font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
                  Atendimento
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Informe onde e como o serviço será realizado. Esses dados ajudam no
                  cálculo e no planejamento.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Urgência"
                    options={fieldOptions(
                      draft,
                      "urgency",
                      cleaningSimulationSelectOptions.urgency,
                    )}
                    value={draftData.access.urgency}
                    onChange={(value) =>
                      updateDraftData((current) => ({
                        ...current,
                        access: {
                          ...current.access,
                          urgency: value,
                        },
                      }))
                    }
                  />

                  <TextField
                    inputMode="decimal"
                    label="Distância aproximada em km"
                    value={draftData.access.distanceKm}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        access: {
                          ...current.access,
                          distanceKm: parseNumberInput(event.target.value),
                        },
                      }))
                    }
                  />

                  <TextField
                    inputMode="numeric"
                    label="Andar"
                    value={draftData.access.floor}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        access: {
                          ...current.access,
                          floor: parseIntegerInput(event.target.value),
                        },
                      }))
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <CheckboxField
                      checked={draftData.access.hasElevator}
                      label="Possui elevador"
                      onChange={(checked) =>
                        updateDraftData((current) => ({
                          ...current,
                          access: {
                            ...current.access,
                            hasElevator: checked,
                          },
                        }))
                      }
                    />
                    <CheckboxField
                      checked={draftData.access.parking}
                      label="Possui estacionamento"
                      onChange={(checked) =>
                        updateDraftData((current) => ({
                          ...current,
                          access: {
                            ...current.access,
                            parking: checked,
                          },
                        }))
                      }
                    />
                  </div>

                  <TextAreaField
                    className="md:col-span-2"
                    label="Endereço do atendimento"
                    placeholder="Rua, número, bairro, cidade e algum ponto de referência."
                    requiredMarker
                    rows={3}
                    value={draftData.address.fullAddress}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          fullAddress: event.target.value,
                        },
                      }))
                    }
                  />

                  <TextAreaField
                    className="md:col-span-2"
                    label="Observações gerais"
                    placeholder="Exemplo: melhor horário para contato, restrições de acesso ou detalhes importantes."
                    rows={3}
                    value={draftData.notes}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                <h2 className="font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
                  Seus dados de contato
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  A empresa usará essas informações para retornar com a proposta e
                  combinar os próximos passos.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <TextField
                    label="Nome"
                    placeholder="Seu nome"
                    required
                    value={draftData.contact.name}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        contact: {
                          ...current.contact,
                          name: event.target.value,
                        },
                      }))
                    }
                  />

                  <TextField
                    inputMode="tel"
                    label="WhatsApp"
                    placeholder="(11) 99999-9999"
                    required
                    value={draftData.contact.whatsapp}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        contact: {
                          ...current.contact,
                          whatsapp: formatBrazilianPhoneInput(event.target.value),
                        },
                      }))
                    }
                  />

                  <TextField
                    label="E-mail"
                    placeholder="voce@email.com"
                    type="email"
                    value={draftData.contact.email}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        contact: {
                          ...current.contact,
                          email: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </section>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      Estimativa
                    </p>
                    <h2 className="font-serif text-2xl font-normal tracking-[-0.04em]">
                      Revisão do pedido
                    </h2>
                  </div>
                </div>

                {estimate ? (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                      <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                        Faixa estimada
                      </div>
                      <div className="mt-3 font-serif text-3xl font-normal leading-tight tracking-[-0.045em] text-[var(--color-text-primary)]">
                        {formatMoneyCents(estimate.estimateMinCents)}
                        <span className="block text-[var(--color-text-muted)]">
                          a {formatMoneyCents(estimate.estimateMaxCents)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {estimate.itemEstimates.map((item) => (
                        <div
                          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                          key={item.itemId}
                        >
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[var(--color-text-secondary)]">
                              {item.label}
                            </span>
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {formatMoneyCents(item.internalTotalCents)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-[var(--color-text-secondary)]">
                    Calcule a estimativa para revisar uma faixa inicial antes de enviar o
                    pedido para a empresa.
                  </p>
                )}

                <div className="mt-6 grid gap-2">
                  <ActionButton
                    icon={Save}
                    isLoading={saveMutation.isPending}
                    variant="secondary"
                    onClick={saveDraft}
                  >
                    Salvar rascunho
                  </ActionButton>

                  <ActionButton
                    icon={Calculator}
                    isLoading={estimateMutation.isPending}
                    onClick={estimateDraft}
                  >
                    Calcular estimativa
                  </ActionButton>

                  <ActionButton
                    disabled={!estimate}
                    icon={Send}
                    isLoading={submitMutation.isPending}
                    onClick={submitDraft}
                  >
                    Enviar solicitação
                  </ActionButton>
                </div>

                <FormError message={formError} />
              </section>

              <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      Anexos
                    </p>
                    <h2 className="font-serif text-2xl font-normal tracking-[-0.04em]">
                      Arquivos enviados
                    </h2>
                  </div>
                </div>

                {draft.files.length > 0 ? (
                  <ul className="mt-5 space-y-2">
                    {draft.files.map((file) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-secondary)]"
                        key={file.id}
                      >
                        <span className="truncate">{file.fileName}</span>
                        <button
                          className="shrink-0 rounded-full p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
                          type="button"
                          onClick={() => deleteFileMutation.mutate(file.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Nenhum arquivo foi anexado ainda.
                  </p>
                )}
              </section>
            </aside>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}

function QuoteItemEditor({
  draft,
  files,
  index,
  isBusy,
  item,
  uploadFeedback,
  onAddFile,
  onDuplicate,
  onRemove,
  onUpdate,
}: {
  draft: QuoteDraftDetail;
  files: QuoteDraftDetail["files"];
  index: number;
  isBusy: boolean;
  item: QuoteDraftItem;
  uploadFeedback: string | null;
  onAddFile: (files: FileList) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<QuoteDraftItem>) => void;
}) {
  const showSeats = isQuoteItemFieldVisible(draft, "seats", item);

  function updateItemType(itemType: string) {
    const nextItem = {
      ...item,
      itemType,
    };
    const seatsVisible = isQuoteItemFieldVisible(draft, "seats", nextItem);

    onUpdate({
      itemType,
      ...(seatsVisible ? { seats: Math.max(1, item.seats) } : { seats: 0 }),
    });
  }

  return (
    <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TextField
          className="min-w-[220px] flex-1"
          label={`Item ${index + 1}`}
          placeholder="Exemplo: sofá da sala, poltrona, colchão..."
          value={item.label}
          onChange={(event) => onUpdate({ label: event.target.value })}
        />

        <div className="flex gap-2 self-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
            type="button"
            onClick={onDuplicate}
          >
            Duplicar
          </button>

          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:border-rose-300/30 hover:bg-rose-300/10 hover:text-rose-200"
            type="button"
            onClick={onRemove}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SelectField
          label="Tipo"
          options={fieldOptions(
            draft,
            "item_type",
            cleaningSimulationSelectOptions.itemType,
          )}
          requiredMarker={isQuoteFieldRequired(draft, "item_type")}
          value={item.itemType}
          onChange={updateItemType}
        />

        <TextField
          inputMode="numeric"
          label="Quantidade idêntica"
          requiredMarker={isQuoteFieldRequired(draft, "quantity")}
          value={item.quantity}
          onChange={(event) =>
            onUpdate({ quantity: Math.max(1, parseIntegerInput(event.target.value)) })
          }
        />

        <SelectField
          label="Tamanho"
          options={fieldOptions(draft, "size", cleaningSimulationSelectOptions.size)}
          requiredMarker={isQuoteFieldRequired(draft, "size")}
          value={item.size}
          onChange={(value) => onUpdate({ size: value })}
        />

        {showSeats ? (
          <TextField
            inputMode="numeric"
            label="Lugares"
            requiredMarker={isQuoteFieldRequired(draft, "seats")}
            value={item.seats}
            onChange={(event) =>
              onUpdate({ seats: parseIntegerInput(event.target.value) })
            }
          />
        ) : null}

        <SelectField
          label="Tecido"
          options={fieldOptions(
            draft,
            "fabric_type",
            cleaningSimulationSelectOptions.fabricType,
          )}
          requiredMarker={isQuoteFieldRequired(draft, "fabric_type")}
          value={item.fabricType}
          onChange={(value) => onUpdate({ fabricType: value })}
        />

        <SelectField
          label="Nível de sujeira"
          options={fieldOptions(
            draft,
            "dirt_level",
            cleaningSimulationSelectOptions.dirtLevel,
          )}
          requiredMarker={isQuoteFieldRequired(draft, "dirt_level")}
          value={item.dirtLevel}
          onChange={(value) => onUpdate({ dirtLevel: value })}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <CheckboxField
          checked={item.hasStains}
          label="Possui manchas"
          onChange={(checked) => onUpdate({ hasStains: checked })}
        />

        <CheckboxField
          checked={item.odor}
          label="Possui odor"
          onChange={(checked) => onUpdate({ odor: checked })}
        />

        <CheckboxField
          checked={item.petHair}
          label="Possui pelos"
          onChange={(checked) => onUpdate({ petHair: checked })}
        />

        <CheckboxField
          checked={item.petsPresent}
          label="Animais no local"
          onChange={(checked) => onUpdate({ petsPresent: checked })}
        />

        <CheckboxField
          checked={item.waterproofing}
          label="Impermeabilização"
          onChange={(checked) => onUpdate({ waterproofing: checked })}
        />

        <label className="group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]">
          <Upload size={16} />
          <RequiredLabel isRequired>Fotos ou PDF</RequiredLabel>
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            disabled={isBusy}
            multiple
            type="file"
            onChange={(event) => {
              if (event.target.files?.length) {
                onAddFile(event.target.files);
              }
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {formatQuoteFileCount(files.length)} neste item
          </p>
          {uploadFeedback ? (
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              {uploadFeedback}
            </p>
          ) : null}
        </div>
        {files.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {files.map((file) => (
              <li
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-secondary)]"
                key={file.id}
              >
                <span className="truncate">{file.fileName}</span>
                <span className="shrink-0">{formatBytes(file.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
            Selecione fotos do item ou um PDF para ajudar a empresa na avaliação.
          </p>
        )}
      </div>

      <TextAreaField
        className="mt-5"
        label="Observação do item"
        placeholder="Detalhe algo específico sobre este item, se necessário."
        rows={2}
        value={item.notes}
        onChange={(event) => onUpdate({ notes: event.target.value })}
      />
    </div>
  );
}

export function PublicTrackingPage() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [proposalRejectReasonCode, setProposalRejectReasonCode] =
    useState<PublicProposalRejectRequest["reasonCode"]>("price");
  const [proposalRejectReason, setProposalRejectReason] = useState("");
  const trackingQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ["public-tracking", token],
    queryFn: () =>
      apiRequest<PublicTrackingResponse>(
        `/api/public/tracking/${encodeURIComponent(String(token))}`,
      ),
  });

  const appointmentMutation = useMutation({
    mutationFn: (
      body: Parameters<typeof customerAppointmentActionRequestSchema.parse>[0],
    ) =>
      apiRequest<PublicTrackingAppointmentActionResponse>(
        `/api/public/tracking/${encodeURIComponent(String(token))}/appointment`,
        {
          method: "POST",
          body: JSON.stringify(customerAppointmentActionRequestSchema.parse(body)),
        },
      ),
    onSuccess(response) {
      setRescheduleReason("");
      queryClient.setQueryData(["public-tracking", token], response.tracking);
    },
  });

  const tracking = trackingQuery.data;
  const canLoadPublicProposal = Boolean(
    token &&
    tracking?.latestProposal &&
    isPublicProposalStatusVisible(tracking.latestProposal.latestVersionStatus),
  );

  const proposalQuery = useQuery({
    enabled: canLoadPublicProposal,
    queryKey: ["public-proposal", token],
    queryFn: () =>
      apiRequest<PublicTrackingProposalDetailResponse>(
        `/api/public/tracking/${encodeURIComponent(String(token))}/proposal`,
      ),
  });

  const acceptProposalMutation = useMutation({
    mutationFn: () =>
      apiRequest<PublicTrackingProposalActionResponse>(
        `/api/public/tracking/${encodeURIComponent(String(token))}/proposal/accept`,
        {
          method: "POST",
          headers: createIdempotencyHeaders(),
          body: JSON.stringify(
            publicProposalAcceptRequestSchema.parse({
              acceptedLegalTerms: true,
            }),
          ),
        },
      ),
    onSuccess(response) {
      queryClient.setQueryData(["public-tracking", token], response.tracking);
      queryClient.setQueryData(["public-proposal", token], {
        proposal: response.proposal,
      });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: () =>
      apiRequest<PublicTrackingProposalActionResponse>(
        `/api/public/tracking/${encodeURIComponent(String(token))}/proposal/reject`,
        {
          method: "POST",
          headers: createIdempotencyHeaders(),
          body: JSON.stringify(
            publicProposalRejectRequestSchema.parse({
              reasonCode: proposalRejectReasonCode,
              ...(proposalRejectReason.trim()
                ? { reason: proposalRejectReason.trim() }
                : {}),
            }),
          ),
        },
      ),
    onSuccess(response) {
      setProposalRejectReason("");
      queryClient.setQueryData(["public-tracking", token], response.tracking);
      queryClient.setQueryData(["public-proposal", token], {
        proposal: response.proposal,
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      apiRequest<PublicReviewCreateResponse>("/api/public/reviews", {
        method: "POST",
        headers: createIdempotencyHeaders(),
        body: JSON.stringify(
          publicReviewCreateRequestSchema.parse({
            publicToken: String(token),
            rating: Number(reviewRating),
            ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
          }),
        ),
      }),
    onSuccess() {
      setReviewSubmitted(true);
      setReviewComment("");
      void queryClient.invalidateQueries({ queryKey: ["public-company"] });
      void queryClient.invalidateQueries({ queryKey: ["public-companies"] });
      void queryClient.invalidateQueries({ queryKey: ["public-companies-home"] });
    },
  });

  const latestAppointment = tracking ? getLatestAppointment(tracking.appointments) : null;

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Acompanhamento" title="Seu pedido em um só lugar." />
          <SecondaryLink icon={KeyRound} to="/recuperar">
            Recuperar outro acesso
          </SecondaryLink>
        </div>

        {trackingQuery.isLoading ? <LoadingLine /> : null}

        {trackingQuery.error ? (
          <ErrorPanel
            error={trackingQuery.error}
            fallback="Não foi possível abrir o acompanhamento."
          />
        ) : null}

        {tracking ? (
          <div className="mt-7 space-y-6">
            <section className="relative overflow-hidden rounded-[38px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8">
              <div className="absolute right-[-90px] top-[-90px] h-56 w-56 rounded-full bg-[var(--color-accent-soft)] blur-[90px]" />

              <div className="relative flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                    {tracking.company.name}
                  </p>
                  <h2 className="mt-3 max-w-2xl font-serif text-5xl font-normal leading-[0.95] tracking-[-0.055em] text-[var(--color-text-primary)]">
                    {tracking.service.name}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Código da solicitação:{" "}
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {tracking.quoteRequest.requestCode}
                    </span>
                  </p>
                </div>

                <QuoteRequestStatusBadge status={tracking.quoteRequest.status} />
              </div>

              <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
                <InfoBlock
                  label="Enviada em"
                  value={formatDate(tracking.quoteRequest.submittedAt)}
                />
                <InfoBlock
                  label="Última atualização"
                  value={formatDate(tracking.quoteRequest.updatedAt)}
                />
                <InfoBlock
                  label="Estimativa inicial"
                  value={
                    tracking.quoteRequest.estimate
                      ? `${formatMoneyCents(
                          tracking.quoteRequest.estimate.estimateMinCents,
                        )} a ${formatMoneyCents(
                          tracking.quoteRequest.estimate.estimateMaxCents,
                        )}`
                      : "Aguardando cálculo"
                  }
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <section className="space-y-6">
                <PublicProposalPanel
                  actionError={
                    acceptProposalMutation.error
                      ? errorMessage(
                          acceptProposalMutation.error,
                          "Não foi possível aceitar a proposta.",
                        )
                      : rejectProposalMutation.error
                        ? errorMessage(
                            rejectProposalMutation.error,
                            "Não foi possível recusar a proposta.",
                          )
                        : null
                  }
                  isAccepting={acceptProposalMutation.isPending}
                  isLoadingDetail={proposalQuery.isFetching}
                  isRejecting={rejectProposalMutation.isPending}
                  proposal={tracking.latestProposal}
                  proposalDetail={proposalQuery.data?.proposal ?? null}
                  proposalPdfUrl={apiUrl(
                    `/api/public/tracking/${encodeURIComponent(
                      String(token),
                    )}/proposal/pdf`,
                  )}
                  rejectReason={proposalRejectReason}
                  rejectReasonCode={proposalRejectReasonCode}
                  onAccept={() => acceptProposalMutation.mutate()}
                  onReject={() => rejectProposalMutation.mutate()}
                  onRejectReasonChange={setProposalRejectReason}
                  onRejectReasonCodeChange={setProposalRejectReasonCode}
                />

                <PublicAppointmentPanel
                  appointment={latestAppointment}
                  error={
                    appointmentMutation.error
                      ? errorMessage(
                          appointmentMutation.error,
                          "Não foi possível atualizar o horário.",
                        )
                      : null
                  }
                  isLoading={appointmentMutation.isPending}
                  reason={rescheduleReason}
                  onReasonChange={setRescheduleReason}
                  onConfirm={() => appointmentMutation.mutate({ action: "confirm" })}
                  onRequestReschedule={() =>
                    appointmentMutation.mutate({
                      action: "request_reschedule",
                      reason: rescheduleReason,
                    })
                  }
                />

                <PublicReviewPanel
                  appointment={latestAppointment}
                  error={
                    reviewMutation.error
                      ? errorMessage(
                          reviewMutation.error,
                          "Não foi possível enviar a avaliação.",
                        )
                      : null
                  }
                  isLoading={reviewMutation.isPending}
                  proposal={tracking.latestProposal}
                  rating={reviewRating}
                  reviewSubmitted={reviewSubmitted}
                  comment={reviewComment}
                  onCommentChange={setReviewComment}
                  onRatingChange={setReviewRating}
                  onSubmit={() => reviewMutation.mutate()}
                />
              </section>

              <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                        Contato
                      </p>
                      <h2 className="font-serif text-2xl font-normal tracking-[-0.04em]">
                        Falar com a empresa
                      </h2>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[var(--color-text-secondary)]">
                    Use o WhatsApp para tirar dúvidas sobre esta solicitação sem perder o
                    contexto do pedido.
                  </p>

                  {tracking.whatsappUrl ? (
                    <a
                      className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
                      href={tracking.whatsappUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <MessageCircle size={18} />
                      Abrir WhatsApp
                    </a>
                  ) : (
                    <p className="mt-5 text-sm leading-6 text-[var(--color-text-muted)]">
                      A empresa ainda não informou um WhatsApp público.
                    </p>
                  )}
                </section>

                <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                      <ClipboardList size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                        Pedido
                      </p>
                      <h2 className="font-serif text-2xl font-normal tracking-[-0.04em]">
                        Resumo enviado
                      </h2>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    <p>
                      <span className="text-[var(--color-text-muted)]">Itens:</span>{" "}
                      {tracking.quoteRequest.data.items.length}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">Endereço:</span>{" "}
                      {formatQuoteAddress(tracking.quoteRequest.data.address)}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">Observações:</span>{" "}
                      {tracking.quoteRequest.data.notes || "Sem observações gerais."}
                    </p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}

function PublicProposalPanel({
  actionError,
  isAccepting,
  isLoadingDetail,
  isRejecting,
  onAccept,
  onReject,
  onRejectReasonChange,
  onRejectReasonCodeChange,
  proposal,
  proposalDetail,
  proposalPdfUrl,
  rejectReason,
  rejectReasonCode,
}: {
  actionError: string | null;
  isAccepting: boolean;
  isLoadingDetail: boolean;
  isRejecting: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onRejectReasonCodeChange: (value: PublicProposalRejectRequest["reasonCode"]) => void;
  proposal: PublicTrackingResponse["latestProposal"];
  proposalDetail: PublicProposalDetail | null;
  proposalPdfUrl: string;
  rejectReason: string;
  rejectReasonCode: PublicProposalRejectRequest["reasonCode"];
}) {
  const version = proposalDetail?.latestVersion;
  const status = proposalDetail?.latestVersionStatus ?? proposal?.latestVersionStatus;
  const hasPublicProposal = Boolean(proposal && isPublicProposalStatusVisible(status));
  const canDecide = status === "sent" || status === "viewed";
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
      <div className="absolute right-[-90px] top-[-90px] h-48 w-48 rounded-full bg-[var(--color-accent-soft)] blur-[80px]" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Proposta
          </p>
          <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
            Valor final e condições
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
            Confira os itens, validade e condições antes de confirmar sua decisão.
          </p>
        </div>

        {hasPublicProposal ? (
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
            href={proposalPdfUrl}
            rel="noreferrer"
            target="_blank"
          >
            <FileText size={16} />
            Abrir PDF
          </a>
        ) : null}
      </div>

      {hasPublicProposal && proposal ? (
        <div className="relative mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Código" value={proposal.latestProposalCode ?? "Pendente"} />
            <InfoBlock
              label="Valor final"
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
            <InfoBlock
              label="Status"
              value={
                proposal.latestVersionStatus
                  ? proposalVersionStatusLabels[proposal.latestVersionStatus]
                  : "Pendente"
              }
            />
          </div>

          {isLoadingDetail ? <LoadingLine /> : null}

          {version ? (
            <div className="space-y-5 border-t border-[var(--color-border)] pt-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Itens da proposta
                </h3>

                <div className="mt-3 space-y-2">
                  {version.items.map((item) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm"
                      key={item.id}
                    >
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          Quantidade: {item.quantity}
                        </p>
                      </div>

                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {formatMoneyCents(item.finalTotalCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {version.terms ? (
                <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Condições da proposta
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--color-text-secondary)]">
                    {version.terms}
                  </p>
                  <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                    Versão dos termos: {version.termsVersion}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isAccepted ? (
            <div className="rounded-[26px] border border-lime-300/25 bg-lime-300/10 p-5 text-sm leading-7 text-lime-100">
              Proposta aceita. A empresa já pode seguir com os próximos detalhes do
              atendimento.
            </div>
          ) : null}

          {isRejected ? (
            <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm leading-7 text-[var(--color-text-secondary)]">
              Proposta recusada. Você ainda pode falar com a empresa pelo WhatsApp caso
              queira negociar uma nova versão.
            </div>
          ) : null}

          {canDecide ? (
            <div className="space-y-5 border-t border-[var(--color-border)] pt-6">
              <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm leading-7 text-[var(--color-text-secondary)]">
                Ao aceitar, você confirma o valor final desta versão da proposta e os
                termos apresentados.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionButton
                  icon={CheckCircle2}
                  isLoading={isAccepting}
                  onClick={onAccept}
                >
                  Aceitar proposta
                </ActionButton>

                <ActionButton
                  icon={XCircle}
                  isLoading={isRejecting}
                  variant="secondary"
                  onClick={onReject}
                >
                  Recusar proposta
                </ActionButton>
              </div>

              <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                <SelectField
                  label="Motivo da recusa"
                  options={[
                    ["price", "Valor"],
                    ["deadline", "Prazo"],
                    ["schedule", "Horário"],
                    ["hired_another_company", "Contratei outra empresa"],
                    ["gave_up", "Desisti"],
                    ["other", "Outro"],
                  ]}
                  value={rejectReasonCode}
                  onChange={(value) =>
                    onRejectReasonCodeChange(
                      value as PublicProposalRejectRequest["reasonCode"],
                    )
                  }
                />

                <TextAreaField
                  label="Observação opcional"
                  placeholder="Conte brevemente o motivo, se quiser."
                  rows={2}
                  value={rejectReason}
                  onChange={(event) => onRejectReasonChange(event.target.value)}
                />
              </div>

              <FormError message={actionError} />
            </div>
          ) : (
            <FormError message={actionError} />
          )}
        </div>
      ) : (
        <p className="relative mt-5 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm leading-7 text-[var(--color-text-secondary)]">
          A empresa ainda não enviou uma proposta. Quando ela estiver disponível, você
          poderá revisar o valor final e confirmar a decisão por aqui.
        </p>
      )}
    </section>
  );
}

function PublicReviewPanel({
  appointment,
  comment,
  error,
  isLoading,
  onCommentChange,
  onRatingChange,
  onSubmit,
  proposal,
  rating,
  reviewSubmitted,
}: {
  appointment: CompanyAppointment | null | undefined;
  comment: string;
  error: string | null;
  isLoading: boolean;
  onCommentChange: (value: string) => void;
  onRatingChange: (value: string) => void;
  onSubmit: () => void;
  proposal: PublicTrackingResponse["latestProposal"];
  rating: string;
  reviewSubmitted: boolean;
}) {
  const canReview =
    proposal?.latestVersionStatus === "accepted" &&
    appointment?.status === "completed" &&
    appointment.serviceStatus === "service_realized";

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Avaliacao</h2>
        {canReview ? (
          <span className="rounded-md border border-emerald-300/25 px-2 py-1 text-xs text-emerald-100">
            Disponivel
          </span>
        ) : null}
      </div>
      {!canReview ? (
        <p className="mt-4 text-sm leading-6 text-white/55">
          A avaliacao fica disponivel depois que a proposta aceita tiver horario
          confirmado e a empresa marcar o atendimento como realizado.
        </p>
      ) : reviewSubmitted ? (
        <div className="mt-4 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          Obrigado pela avaliacao. Ela ja pode aparecer no perfil publico da empresa.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block text-sm text-white/70">
            Nota
            <select
              className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
              value={rating}
              onChange={(event) => onRatingChange(event.target.value)}
            >
              <option value="5">5 - Excelente</option>
              <option value="4">4 - Muito bom</option>
              <option value="3">3 - Bom</option>
              <option value="2">2 - Regular</option>
              <option value="1">1 - Ruim</option>
            </select>
          </label>
          <TextAreaField
            label="Comentario opcional"
            rows={4}
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
          />
          <ActionButton icon={Star} isLoading={isLoading} onClick={onSubmit}>
            Enviar avaliacao
          </ActionButton>
          <FormError message={error} />
        </div>
      )}
    </section>
  );
}

function PublicAppointmentPanel({
  appointment,
  error,
  isLoading,
  onConfirm,
  onRequestReschedule,
  onReasonChange,
  reason,
}: {
  appointment: CompanyAppointment | null | undefined;
  error: string | null;
  isLoading: boolean;
  onConfirm: () => void;
  onRequestReschedule: () => void;
  onReasonChange: (value: string) => void;
  reason: string;
}) {
  const canCustomerAct =
    appointment && ["proposed", "rescheduled"].includes(appointment.status);

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Horario</h2>
        {appointment ? <AppointmentStatusBadge status={appointment.status} /> : null}
      </div>
      {appointment ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Quando" value={formatAppointmentWindow(appointment)} />
            <InfoBlock
              label="Duracao"
              value={formatDurationMinutes(appointment.durationMinutes)}
            />
          </div>
          {appointment.address ? (
            <p className="text-sm text-white/60">{appointment.address}</p>
          ) : null}
          {canCustomerAct ? (
            <div className="space-y-3">
              <TextAreaField
                label="Motivo para outro horario"
                rows={3}
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  icon={CheckCircle2}
                  isLoading={isLoading}
                  onClick={onConfirm}
                >
                  Confirmar horario
                </ActionButton>
                <ActionButton
                  icon={RefreshCcw}
                  isLoading={isLoading}
                  variant="secondary"
                  onClick={onRequestReschedule}
                >
                  Pedir outro horario
                </ActionButton>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/55">
              Nenhuma acao de horario esta disponivel agora.
            </p>
          )}
          <FormError message={error} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/55">
          A empresa ainda nao propoe um horario pela plataforma.
        </p>
      )}
    </section>
  );
}

export function PublicRecoveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requestCode, setRequestCode] = useState(searchParams.get("codigo") ?? "");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [recovery, setRecovery] = useState<PublicTrackingRecoveryRequestResponse | null>(
    null,
  );
  const requestMutation = useMutation({
    mutationFn: () =>
      apiRequest<PublicTrackingRecoveryRequestResponse>("/api/public/recovery/request", {
        method: "POST",
        body: JSON.stringify(
          publicTrackingRecoveryRequestSchema.parse({
            requestCode,
            contact,
          }),
        ),
      }),
    onSuccess(response) {
      setRecovery(response);
      setOtp("");
    },
  });
  const verifyMutation = useMutation({
    mutationFn: () =>
      apiRequest<PublicTrackingRecoveryVerifyResponse>("/api/public/recovery/verify", {
        method: "POST",
        body: JSON.stringify(
          publicTrackingRecoveryVerifyRequestSchema.parse({
            requestCode,
            recoveryToken: recovery?.recoveryToken ?? "",
            otp,
          }),
        ),
      }),
    onSuccess(response) {
      navigate(response.trackingPath);
    },
  });

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestMutation.mutate();
  }

  function submitVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verifyMutation.mutate();
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <SectionTitle eyebrow="Recuperacao" title="Recuperar acompanhamento" />
        <section className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-6">
          <form className="space-y-4" onSubmit={submitRequest}>
            <TextField
              label="Codigo da solicitacao"
              value={requestCode}
              onChange={(event) => setRequestCode(event.target.value)}
            />
            <TextField
              label="E-mail ou WhatsApp informado"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
            <SubmitButton icon={KeyRound} isLoading={requestMutation.isPending}>
              Enviar codigo
            </SubmitButton>
            <FormError
              message={
                requestMutation.error
                  ? errorMessage(
                      requestMutation.error,
                      "Nao foi possivel iniciar a recuperacao.",
                    )
                  : null
              }
            />
          </form>

          {recovery ? (
            <form
              className="mt-8 space-y-4 border-t border-white/10 pt-6"
              onSubmit={submitVerify}
            >
              <div className="rounded-md border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                Enviamos um OTP por e-mail para {recovery.maskedEmail}. WhatsApp e usado
                apenas como identificacao complementar.
              </div>
              <TextField
                label="OTP recebido por e-mail"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
              <SubmitButton icon={CheckCircle2} isLoading={verifyMutation.isPending}>
                Abrir acompanhamento
              </SubmitButton>
              <FormError
                message={
                  verifyMutation.error
                    ? errorMessage(
                        verifyMutation.error,
                        "Nao foi possivel validar o codigo.",
                      )
                    : null
                }
              />
            </form>
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}

interface StoredQuoteDraft {
  draftToken: string;
  companySlug: string;
  serviceCode: string;
  currentStep: QuoteDraftData["currentStep"];
  lastActivity: string;
}

async function initializeQuoteDraft(slug: string) {
  const stored = readStoredQuoteDraft(slug);

  if (stored?.draftToken) {
    try {
      const resumed = await apiRequest<QuoteDraftResponse>(
        `/api/public/quote-requests/drafts/${encodeURIComponent(stored.draftToken)}`,
      );

      return {
        draftToken: stored.draftToken,
        draft: resumed.draft,
      };
    } catch (error) {
      if (!(error instanceof ApiError) || ![404, 410].includes(error.status)) {
        throw error;
      }

      removeStoredQuoteDraft(slug);
    }
  }

  const payload = createQuoteDraftRequestSchema.parse({
    companySlug: slug,
  });

  return apiRequest<CreateQuoteDraftResponse>("/api/public/quote-requests/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function createQuoteDraftItem(index: number, source?: QuoteDraftItem): QuoteDraftItem {
  return {
    ...(source ?? {
      label: "",
      itemType: "sofa",
      quantity: 1,
      size: "medium",
      seats: 3,
      fabricType: "suede",
      dirtLevel: "medium",
      hasStains: false,
      stainTypes: [],
      odor: false,
      petHair: false,
      petsPresent: false,
      waterproofing: false,
      notes: "",
    }),
    id: crypto.randomUUID(),
    label: source?.label ? `${source.label} copia` : `Item ${index}`,
  };
}

function requireDraftEnvelope(
  envelope: { draftToken: string; draft: QuoteDraftDetail } | null,
) {
  if (!envelope) {
    throw new Error("Rascunho ainda nao carregado.");
  }

  return envelope;
}

function resolveQuoteDraftFileMimeType(file: File) {
  if (/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  return null;
}

function quoteFilesForItem(files: QuoteDraftDetail["files"], itemId: string) {
  return files.filter((file) => file.itemId === itemId);
}

function formatQuoteFileCount(count: number) {
  return count === 1 ? "1 anexo" : `${count} anexos`;
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateQuoteSubmissionDraft(data: QuoteDraftData, fileCount: number) {
  if (!data.contact.name.trim()) {
    return "Informe o nome para contato.";
  }

  if (data.contact.whatsapp.trim().length < 8) {
    return "Informe um WhatsApp válido para contato.";
  }

  if (!hasQuoteSubmissionAddress(data)) {
    return "Informe o endereço do atendimento.";
  }

  if (fileCount === 0) {
    return "Anexe pelo menos uma foto ou arquivo do serviço.";
  }

  return null;
}

function hasQuoteSubmissionAddress(data: QuoteDraftData) {
  return (
    Boolean(data.address.fullAddress.trim()) ||
    (Boolean(data.address.street.trim()) && Boolean(data.address.city.trim()))
  );
}

function quoteDraftStorageKey(slug: string) {
  return `velaris:quote-draft:${slug}`;
}

function readStoredQuoteDraft(slug: string): StoredQuoteDraft | null {
  const raw = window.localStorage.getItem(quoteDraftStorageKey(slug));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredQuoteDraft;
  } catch {
    removeStoredQuoteDraft(slug);
    return null;
  }
}

function persistQuoteDraftToken(slug: string, value: StoredQuoteDraft) {
  if (!value.draftToken) {
    return;
  }

  window.localStorage.setItem(quoteDraftStorageKey(slug), JSON.stringify(value));
}

function removeStoredQuoteDraft(slug: string) {
  window.localStorage.removeItem(quoteDraftStorageKey(slug));
}

function isPublicProposalStatusVisible(status: string | null | undefined) {
  return Boolean(
    status && ["sent", "viewed", "accepted", "rejected", "expired"].includes(status),
  );
}

const quoteStepItems: Array<{
  code: QuoteDraftData["currentStep"];
  label: string;
}> = [
  { code: "items", label: "Itens" },
  { code: "details", label: "Atendimento" },
  { code: "contact", label: "Contato" },
  { code: "review", label: "Revisão" },
];

function CompanyGrid({ companies }: { companies: PublicCompanySummary[] }) {
  if (companies.length === 0) {
    return (
      <div className="mt-6 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm leading-6 text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
        Nenhuma empresa publicada atende os filtros informados no momento.
      </div>
    );
  }

  return (
    <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => (
        <CompanyCard company={company} key={company.id} />
      ))}
    </div>
  );
}

function CompanyCard({ company }: { company: PublicCompanySummary }) {
  return (
    <Link
      className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)]"
      to={`/empresa/${company.slug}`}
    >
      <div className="pointer-events-none absolute right-[-60px] top-[-60px] h-36 w-36 rounded-full bg-[var(--color-accent-soft)] opacity-0 blur-[60px] transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
            {company.logoUrl ? (
              <img alt="" className="h-full w-full object-cover" src={company.logoUrl} />
            ) : (
              <Building2 size={23} />
            )}
          </div>

          <div>
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              {company.tradingName}
            </h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {company.nicheLabel}
            </p>
          </div>
        </div>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] transition group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-text-inverted)]">
          <ArrowRight size={17} />
        </span>
      </div>

      <p className="relative mt-6 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)]">
        {company.headline ??
          company.description ??
          "Perfil publicado na Velaris para receber solicitações de orçamento com mais clareza."}
      </p>

      <div className="relative mt-auto space-y-3 pt-6 text-sm text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>
            {[company.city, company.state].filter(Boolean).join(", ") ||
              "Região informada no perfil"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <LocateFixed size={16} />
          <span>
            {company.distanceKm !== null
              ? `${company.distanceKm} km de distância`
              : company.serviceRadiusKm !== null
                ? `Raio de atendimento: ${company.serviceRadiusKm} km`
                : "Regiões atendidas pela empresa"}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-[var(--color-text-primary)]">
          <span className="inline-flex items-center gap-1">
            <Star size={16} />
            {company.reviewSummary.count > 0
              ? `${company.reviewSummary.average} (${company.reviewSummary.count})`
              : "Sem avaliações"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text-secondary)] transition group-hover:text-[var(--color-text-primary)]">
            Abrir perfil
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PublicCompanyProfile({ company }: { company: PublicCompanyDetail }) {
  const queryClient = useQueryClient();
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const accentColor = company.primaryColor ?? "#f2f2f4";
  const favoriteMutation = useMutation({
    mutationFn: () => {
      const payload = customerFavoriteCompanyRequestSchema.parse({
        companyId: company.id,
      });

      return apiRequest<CustomerFavoriteResponse>("/api/customer/favorites", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess() {
      setFavoriteMessage("Empresa salva nos seus favoritos.");
      void queryClient.invalidateQueries({ queryKey: ["customer-dashboard"] });
    },
    onError() {
      setFavoriteMessage(null);
    },
  });
  const favoriteError =
    favoriteMutation.error instanceof ApiError &&
    (favoriteMutation.error.status === 401 || favoriteMutation.error.status === 403)
      ? "Entre como cliente para salvar empresas nos favoritos."
      : favoriteMutation.error
        ? errorMessage(favoriteMutation.error, "Não foi possível favoritar agora.")
        : null;

  return (
    <article>
      <section className="relative overflow-hidden rounded-[40px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
        <div
          className="h-64 bg-[var(--color-app-bg-soft)] bg-cover bg-center"
          style={
            company.coverImageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.58)), url(${company.coverImageUrl})`,
                }
              : {
                  background: `radial-gradient(circle at 72% 28%, ${accentColor}33, transparent 32%), linear-gradient(135deg, var(--color-surface-strong), var(--color-app-bg-soft))`,
                }
          }
        />

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
                {company.logoUrl ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={company.logoUrl}
                  />
                ) : (
                  <Building2 size={30} />
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                  {company.nicheLabel}
                </p>
                <h1 className="mt-2 font-serif text-5xl font-normal leading-[0.95] tracking-[-0.055em] text-[var(--color-text-primary)]">
                  {company.tradingName}
                </h1>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  {[company.city, company.state].filter(Boolean).join(", ") ||
                    "Região informada no perfil"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)] disabled:cursor-wait disabled:opacity-70"
                  disabled={favoriteMutation.isPending}
                  type="button"
                  onClick={() => favoriteMutation.mutate()}
                >
                  <Heart size={18} />
                  {favoriteMutation.isPending ? "Salvando..." : "Favoritar"}
                </button>

                <PrimaryLink icon={PlusCircle} to={`/empresa/${company.slug}/orcamento`}>
                  Solicitar orçamento
                </PrimaryLink>
              </div>

              {favoriteMessage ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {favoriteMessage}
                </p>
              ) : null}
              <FormError message={favoriteError} />
            </div>
          </div>

          <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--color-text-secondary)]">
            {company.description ??
              company.headline ??
              "Perfil público da empresa na Velaris Orçamentos."}
          </p>
        </div>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <ProfileSection title="Serviços">
            {company.services.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {company.services.map((service) => (
                  <div
                    className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5"
                    key={service.name}
                  >
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      {service.name}
                    </h3>
                    {service.description ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Os serviços serão exibidos assim que a empresa completar o perfil.
              </p>
            )}
          </ProfileSection>

          <ProfileSection title="Galeria">
            {company.gallery.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {company.gallery.map((item) => (
                  <img
                    alt={item.alt ?? ""}
                    className="aspect-[4/3] rounded-[26px] border border-[var(--color-border)] object-cover shadow-[var(--shadow-soft)]"
                    key={item.url}
                    src={item.url}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                A galeria ainda não foi informada.
              </p>
            )}
          </ProfileSection>

          <ProfileSection title="Avaliações">
            {company.reviews.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {company.reviews.map((review) => (
                  <div
                    className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5"
                    key={review.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {review.rating}/5 — {review.customerName}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {review.serviceName} — {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <Star className="text-[var(--color-text-secondary)]" size={17} />
                    </div>

                    {review.comment ? (
                      <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Esta empresa ainda não possui avaliações públicas.
              </p>
            )}
          </ProfileSection>
        </section>

        <aside className="space-y-4">
          <InfoBlock
            label="Atendimento"
            value={
              company.serviceCities.length > 0
                ? company.serviceCities.join(", ")
                : "Região definida pela empresa"
            }
          />
          <InfoBlock
            label="Raio"
            value={
              company.serviceRadiusKm !== null
                ? `${company.serviceRadiusKm} km`
                : "Não informado"
            }
          />
          <InfoBlock
            label="Contato"
            value={
              company.contactWhatsapp ??
              company.contactPhone ??
              company.contactEmail ??
              "Contato pelo fluxo Velaris"
            }
          />
          <InfoBlock
            label="Avaliações"
            value={
              company.reviewSummary.count > 0
                ? `${company.reviewSummary.average} de 5`
                : "Sem avaliações públicas"
            }
          />
        </aside>
      </div>
    </article>
  );
}

function ProfileSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
      <h2 className="font-serif text-3xl font-normal tracking-[-0.045em] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
