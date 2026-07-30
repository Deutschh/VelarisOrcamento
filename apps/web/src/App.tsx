import {
  adminCompanyActionRequestSchema,
  adminCompanyPublicProfileRequestSchema,
  adminCreateCompanyConfigurationRequestSchema,
  adminSimulateCompanyConfigurationRequestSchema,
  adminUpdateCompanyConfigurationRequestSchema,
  adminPublishCompanyRequestSchema,
  companyCreateProposalRequestSchema,
  companyQuoteRequestDeclineRequestSchema,
  companyQuoteRequestReviewRequestSchema,
  createQuoteDraftRequestSchema,
  internalNoteRequestSchema,
  loginRequestSchema,
  PUBLIC_COMPANY_CATEGORIES,
  publicCompanySearchQuerySchema,
  quoteDraftFileMetadataRequestSchema,
  registerCompanyRequestSchema,
  submitQuoteDraftRequestSchema,
  updateQuoteDraftRequestSchema,
} from "@velaris/shared";
import type {
  AdminCompanyPublicProfileRequest,
  AdminCompanyDetail,
  AdminCompanySummary,
  AuthUser,
  CalculationResult,
  CompanyConfigurationDetail,
  CompanyConfigurationPreview,
  CompanyFieldConfiguration,
  CompanyFieldOptionConfiguration,
  CompanyQuoteDashboard,
  CompanyProposalDetailResponse,
  CompanyProposalSummary,
  CompanyQuoteRequestDetail,
  CompanyQuoteRequestDetailResponse,
  CompanyQuoteRequestSummary,
  CompanyQuoteRequestsListResponse,
  CompanyServiceConfiguration,
  CompanyAccountStatus,
  CompanyPublicProfileSettings,
  CompanyStatus,
  CreateQuoteDraftResponse,
  LoginRequest,
  NicheTemplate,
  PublicCompanyCategoryCode,
  PublicCompanyDetail,
  PublicCompanySummary,
  QuoteDraftData,
  QuoteDraftDetail,
  QuoteDraftItem,
  QuoteDraftResponse,
  QuoteEstimateResponse,
  QuoteRequestStatus,
  QuoteVersionStatus,
  QuoteSubmitResponse,
  PricingRuleConfiguration,
  RegisterCompanyRequest,
  SchedulingMode,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  CircleSlash2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  LockKeyhole,
  LocateFixed,
  LogIn,
  MapPin,
  PlusCircle,
  Play,
  Save,
  Search,
  Send,
  Settings2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { forwardRef, useEffect, useMemo, useState } from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

interface CleaningSimulationState {
  itemType: string;
  quantity: number;
  size: string;
  seats: number;
  fabricType: string;
  dirtLevel: string;
  hasStains: boolean;
  odor: boolean;
  petHair: boolean;
  petsPresent: boolean;
  waterproofing: boolean;
  urgency: string;
  floor: number;
  hasElevator: boolean;
  parking: boolean;
  distanceKm: number;
}

const defaultCleaningSimulation: CleaningSimulationState = {
  itemType: "sofa",
  quantity: 1,
  size: "medium",
  seats: 3,
  fabricType: "suede",
  dirtLevel: "medium",
  hasStains: true,
  odor: false,
  petHair: false,
  petsPresent: false,
  waterproofing: false,
  urgency: "normal",
  floor: 0,
  hasElevator: true,
  parking: true,
  distanceKm: 8,
};

const cleaningSimulationSelectOptions = {
  itemType: [
    ["sofa", "Sofa"],
    ["armchair", "Poltrona"],
    ["chair", "Cadeira"],
    ["mattress", "Colchao"],
    ["headboard", "Cabeceira"],
    ["puff", "Puff"],
    ["car_seat", "Banco automotivo"],
    ["rug", "Tapete"],
    ["carpet", "Carpete"],
    ["other", "Outro"],
  ],
  size: [
    ["small", "Pequeno"],
    ["medium", "Medio"],
    ["large", "Grande"],
  ],
  fabricType: [
    ["suede", "Suede"],
    ["synthetic_leather", "Couro sintetico"],
    ["linen", "Linho"],
    ["velvet", "Veludo"],
    ["other", "Outro"],
  ],
  dirtLevel: [
    ["light", "Leve"],
    ["medium", "Medio"],
    ["heavy", "Intenso"],
  ],
  urgency: [
    ["normal", "Normal"],
    ["urgent", "Urgente"],
  ],
} satisfies Record<string, Array<[string, string]>>;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      payload?.error?.message ?? "Nao foi possivel concluir a operacao.",
      response.status,
      payload?.error?.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

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

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <header className="border-b border-white/10 bg-[#111216]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="text-lg font-semibold" to="/">
            Velaris Orcamentos
          </Link>
          <nav className="flex items-center gap-2 text-sm text-white/70">
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/empresas">
              Buscar
            </Link>
            <Link
              className="rounded-md px-3 py-2 hover:bg-white/10"
              to="/cadastro/empresa"
            >
              Empresa
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/login">
              Login
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/admin">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function HomePage() {
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="grid min-h-[520px] content-center gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
              Velaris Orcamentos
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
              Encontre empresas e peca seu orcamento.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
              Busque por nicho e regiao para abrir o perfil publico da empresa e iniciar o
              pedido pelo link direto.
            </p>
            <form
              className="mt-8 grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[180px_1fr_auto]"
              onSubmit={submitSearch}
            >
              <select
                className="min-h-12 rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
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
                className="min-h-12 rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
                placeholder="Cidade ou CEP"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-300 px-5 font-medium text-[#111216]"
                type="submit"
              >
                <Search size={18} />
                Buscar
              </button>
            </form>
          </div>
          <aside className="self-center rounded-md border border-white/10 bg-[#12141a] p-6">
            <h2 className="text-xl font-semibold">Categorias</h2>
            <div className="mt-5 grid gap-3">
              {PUBLIC_COMPANY_CATEGORIES.map((item) => (
                <Link
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm hover:bg-white/[0.07]"
                  key={item.code}
                  to={`/empresas?category=${item.code}`}
                >
                  <span>{item.label}</span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </aside>
        </section>
        <section className="border-t border-white/10 py-8">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle eyebrow="Descoberta" title="Empresas publicadas" />
            <Link className="text-sm text-emerald-200 underline" to="/empresas">
              Ver busca completa
            </Link>
          </div>
          {companiesQuery.isLoading ? <LoadingLine /> : null}
          {companiesQuery.error ? (
            <ErrorPanel
              error={companiesQuery.error}
              fallback="Nao foi possivel carregar empresas."
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

function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    {
      title: "Encontre empresas e peca seu orcamento",
      body: "Escolha o servico e informe o que precisa em poucos passos.",
    },
    {
      title: "Envie fotos e detalhes",
      body: "Ajude a empresa a analisar o servico com mais precisao.",
    },
    {
      title: "Receba a proposta e confirme o horario",
      body: "Acompanhe tudo pelo celular, mesmo sem criar conta.",
    },
  ];
  const step = steps[stepIndex] ?? steps[0]!;

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Inicio" title="Como funciona" />
        <section className="mt-8 rounded-md border border-white/10 bg-white/[0.04] p-6">
          <div className="text-sm text-emerald-200">0{stepIndex + 1} / 03</div>
          <h2 className="mt-4 text-2xl font-semibold">{step.title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/65">{step.body}</p>
        </section>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <button
              className={`rounded-md border p-4 text-left text-sm ${
                index === stepIndex
                  ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-white/55"
              }`}
              key={step.title}
              type="button"
              onClick={() => setStepIndex(index)}
            >
              0{index + 1}. {step.title}
            </button>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {stepIndex < steps.length - 1 ? (
            <button
              className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-5 py-3 font-medium text-[#111216]"
              type="button"
              onClick={() => setStepIndex((current) => current + 1)}
            >
              <ArrowRight size={18} />
              Continuar
            </button>
          ) : (
            <PrimaryLink icon={Search} to="/empresas">
              Comecar
            </PrimaryLink>
          )}
          <SecondaryLink icon={ArrowRight} to="/">
            Pular
          </SecondaryLink>
        </div>
      </main>
    </AppShell>
  );
}

function CompaniesSearchPage() {
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
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Busca" title="Empresas disponiveis" />
        <form
          className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[220px_1fr_auto]"
          onSubmit={submitSearch}
        >
          <select
            className="min-h-12 rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
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
            className="min-h-12 rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
            placeholder="Cidade ou CEP"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-300 px-5 font-medium text-[#111216]"
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
            fallback="Nao foi possivel carregar empresas."
          />
        ) : null}
        {companiesQuery.data ? (
          <CompanyGrid companies={companiesQuery.data.companies} />
        ) : null}
      </main>
    </AppShell>
  );
}

function PublicCompanyProfilePage() {
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

function QuoteRequestPage() {
  const { slug } = useParams();
  const [draftEnvelope, setDraftEnvelope] = useState<{
    draftToken: string;
    draft: QuoteDraftDetail;
  } | null>(null);
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);
  const [submitResult, setSubmitResult] = useState<QuoteSubmitResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
        const payload = quoteDraftFileMetadataRequestSchema.parse({
          itemId: input.itemId,
          fieldCode: "photos",
          fileName: file.name,
          mimeType: file.type,
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
    onSuccess(response) {
      syncDraft(response.draft);
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
      setFormError(errorMessage(error, "Nao foi possivel salvar o rascunho."));
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
      setFormError(errorMessage(error, "Nao foi possivel calcular a estimativa."));
    }
  }

  async function submitDraft() {
    if (!draftData) {
      return;
    }

    setFormError(null);

    try {
      await submitMutation.mutateAsync(draftData);
    } catch (error) {
      setFormError(errorMessage(error, "Nao foi possivel enviar a solicitacao."));
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
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <section className="rounded-md border border-emerald-300/30 bg-emerald-300/10 p-6">
            <div className="flex items-center gap-3 text-emerald-100">
              <CheckCircle2 size={24} />
              <h1 className="text-2xl font-semibold">Solicitacao enviada</h1>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Codigo" value={submitResult.requestCode} />
              <InfoBlock
                label="Estimativa"
                value={`${formatMoneyCents(submitResult.estimate.estimateMinCents)} a ${formatMoneyCents(
                  submitResult.estimate.estimateMaxCents,
                )}`}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <SecondaryLink icon={ArrowRight} to={`/empresa/${String(slug)}`}>
                Voltar ao perfil
              </SecondaryLink>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-medium text-white/85 hover:bg-white/10"
                type="button"
                onClick={() => navigator.clipboard.writeText(submitResult.trackingPath)}
              >
                <Copy size={18} />
                Copiar link
              </button>
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {draftQuery.isLoading ? <LoadingLine /> : null}
        {draftQuery.error ? (
          <ErrorPanel
            error={draftQuery.error}
            fallback="Nao foi possivel iniciar o rascunho."
          />
        ) : null}
        {draft && draftData ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="space-y-6">
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-emerald-200">{draft.companyName}</p>
                    <h1 className="mt-2 text-3xl font-semibold">{draft.service.name}</h1>
                    <p className="mt-2 text-sm text-white/55">
                      Rascunho expira em {formatDate(draft.expiresAt)}
                    </p>
                  </div>
                  <SecondaryLink icon={ArrowRight} to={`/empresa/${String(slug)}`}>
                    Perfil
                  </SecondaryLink>
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-4">
                  {quoteStepItems.map((step) => (
                    <button
                      className={`rounded-md border px-3 py-2 text-left text-sm ${
                        draftData.currentStep === step.code
                          ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-[#15171d] text-white/60 hover:bg-white/10"
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
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Itens</h2>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                    type="button"
                    onClick={() => addItem()}
                  >
                    <PlusCircle size={16} />
                    Adicionar item
                  </button>
                </div>
                <div className="mt-5 space-y-4">
                  {draftData.items.map((item, index) => (
                    <QuoteItemEditor
                      draft={draft}
                      index={index}
                      isBusy={isBusy}
                      item={item}
                      key={item.id}
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

              <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-xl font-semibold">Atendimento</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-white/70">
                    Urgencia
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
                      value={draftData.access.urgency}
                      onChange={(event) =>
                        updateDraftData((current) => ({
                          ...current,
                          access: {
                            ...current.access,
                            urgency: event.target.value,
                          },
                        }))
                      }
                    >
                      {fieldOptions(
                        draft,
                        "urgency",
                        cleaningSimulationSelectOptions.urgency,
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField
                    inputMode="decimal"
                    label="Distancia aproximada em km"
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
                    label="Endereco"
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
                    label="Observacoes"
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

              <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-xl font-semibold">Contato</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <TextField
                    label="Nome"
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
                    label="WhatsApp"
                    value={draftData.contact.whatsapp}
                    onChange={(event) =>
                      updateDraftData((current) => ({
                        ...current,
                        contact: {
                          ...current.contact,
                          whatsapp: event.target.value,
                        },
                      }))
                    }
                  />
                  <TextField
                    label="E-mail"
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

            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Calculator size={18} />
                  Estimativa
                </h2>
                {estimate ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="text-sm text-white/50">Faixa exibida</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-100">
                        {formatMoneyCents(estimate.estimateMinCents)} a{" "}
                        {formatMoneyCents(estimate.estimateMaxCents)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {estimate.itemEstimates.map((item) => (
                        <div
                          className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                          key={item.itemId}
                        >
                          <div className="flex justify-between gap-3 text-sm">
                            <span>{item.label}</span>
                            <span>{formatMoneyCents(item.internalTotalCents)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-white/55">
                    Salve e calcule para revisar a faixa antes do envio.
                  </p>
                )}
                <div className="mt-5 grid gap-2">
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
                    Enviar solicitacao
                  </ActionButton>
                </div>
                <FormError message={formError} />
              </section>
              <section className="rounded-md border border-white/10 bg-[#12141a] p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ClipboardList size={18} />
                  Arquivos
                </h2>
                {draft.files.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {draft.files.map((file) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70"
                        key={file.id}
                      >
                        <span className="truncate">{file.fileName}</span>
                        <button
                          className="shrink-0 rounded-md p-2 text-white/50 hover:bg-white/10 hover:text-white"
                          type="button"
                          onClick={() => deleteFileMutation.mutate(file.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-white/50">Nenhum arquivo vinculado.</p>
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
  index,
  isBusy,
  item,
  onAddFile,
  onDuplicate,
  onRemove,
  onUpdate,
}: {
  draft: QuoteDraftDetail;
  index: number;
  isBusy: boolean;
  item: QuoteDraftItem;
  onAddFile: (files: FileList) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<QuoteDraftItem>) => void;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TextField
          className="min-w-[220px] flex-1"
          label={`Item ${index + 1}`}
          value={item.label}
          onChange={(event) => onUpdate({ label: event.target.value })}
        />
        <div className="flex gap-2 self-end">
          <button
            className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
            type="button"
            onClick={onDuplicate}
          >
            Duplicar
          </button>
          <button
            className="rounded-md border border-white/15 p-2 text-white/60 hover:bg-white/10"
            type="button"
            onClick={onRemove}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <SelectField
          label="Tipo"
          options={fieldOptions(
            draft,
            "item_type",
            cleaningSimulationSelectOptions.itemType,
          )}
          value={item.itemType}
          onChange={(value) => onUpdate({ itemType: value })}
        />
        <TextField
          inputMode="numeric"
          label="Quantidade identica"
          value={item.quantity}
          onChange={(event) =>
            onUpdate({ quantity: Math.max(1, parseIntegerInput(event.target.value)) })
          }
        />
        <SelectField
          label="Tamanho"
          options={fieldOptions(draft, "size", cleaningSimulationSelectOptions.size)}
          value={item.size}
          onChange={(value) => onUpdate({ size: value })}
        />
        <TextField
          inputMode="numeric"
          label="Lugares"
          value={item.seats}
          onChange={(event) => onUpdate({ seats: parseIntegerInput(event.target.value) })}
        />
        <SelectField
          label="Tecido"
          options={fieldOptions(
            draft,
            "fabric_type",
            cleaningSimulationSelectOptions.fabricType,
          )}
          value={item.fabricType}
          onChange={(value) => onUpdate({ fabricType: value })}
        />
        <SelectField
          label="Sujeira"
          options={fieldOptions(
            draft,
            "dirt_level",
            cleaningSimulationSelectOptions.dirtLevel,
          )}
          value={item.dirtLevel}
          onChange={(value) => onUpdate({ dirtLevel: value })}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
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
          label="Impermeabilizacao"
          onChange={(checked) => onUpdate({ waterproofing: checked })}
        />
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/10">
          <Upload size={16} />
          Fotos/PDF
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
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
      <TextAreaField
        className="mt-4"
        label="Observacao do item"
        rows={2}
        value={item.notes}
        onChange={(event) => onUpdate({ notes: event.target.value })}
      />
    </div>
  );
}

function SelectField({
  disabled,
  label,
  options,
  value,
  onChange,
}: {
  disabled?: boolean;
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-white/70">
      {label}
      <select
        className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
      <input
        checked={checked}
        className="h-4 w-4 accent-emerald-300"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
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

function fieldOptions(
  draft: { service: { fields: CompanyFieldConfiguration[] } },
  fieldCode: string,
  fallback: Array<[string, string]>,
) {
  const field = draft.service.fields.find((candidate) => candidate.code === fieldCode);
  const options =
    field?.options
      .filter((option) => option.isActive)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((option): [string, string] => [option.code, option.label]) ?? [];

  return options.length > 0 ? options : fallback;
}

function parseIntegerInput(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumberInput(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
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

const quoteStepItems: Array<{
  code: QuoteDraftData["currentStep"];
  label: string;
}> = [
  { code: "items", label: "Itens" },
  { code: "details", label: "Atendimento" },
  { code: "contact", label: "Contato" },
  { code: "review", label: "Revisao" },
];

function CompanyGrid({ companies }: { companies: PublicCompanySummary[] }) {
  if (companies.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-6 text-sm text-white/60">
        Nenhuma empresa publicada atende os filtros informados.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => (
        <CompanyCard company={company} key={company.id} />
      ))}
    </div>
  );
}

function CompanyCard({ company }: { company: PublicCompanySummary }) {
  return (
    <Link
      className="group flex min-h-[260px] flex-col rounded-md border border-white/10 bg-white/[0.04] p-5 transition hover:border-emerald-300/40 hover:bg-white/[0.07]"
      to={`/empresa/${company.slug}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#15171d] text-emerald-200">
            {company.logoUrl ? (
              <img
                alt=""
                className="h-full w-full rounded-md object-cover"
                src={company.logoUrl}
              />
            ) : (
              <Building2 size={22} />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-white">{company.tradingName}</h2>
            <p className="mt-1 text-xs text-emerald-200">{company.nicheLabel}</p>
          </div>
        </div>
        <ArrowRight
          className="text-white/30 transition group-hover:text-emerald-200"
          size={18}
        />
      </div>
      <p className="mt-5 line-clamp-3 text-sm leading-6 text-white/65">
        {company.headline ?? company.description ?? "Perfil publicado na Velaris."}
      </p>
      <div className="mt-auto space-y-3 pt-5 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>
            {[company.city, company.state].filter(Boolean).join(", ") ||
              "Regiao informada no perfil"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LocateFixed size={16} />
          <span>
            {company.distanceKm !== null
              ? `${company.distanceKm} km`
              : company.serviceRadiusKm !== null
                ? `Raio de ${company.serviceRadiusKm} km`
                : "Regioes atendidas"}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 text-white/75">
          <span className="inline-flex items-center gap-1">
            <Star size={16} />
            {company.reviewSummary.count > 0
              ? `${company.reviewSummary.average} (${company.reviewSummary.count})`
              : "Sem avaliacoes"}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-200">
            Abrir
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PublicCompanyProfile({ company }: { company: PublicCompanyDetail }) {
  const accentColor = company.primaryColor ?? "#6ee7b7";

  return (
    <article>
      <section className="overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
        <div
          className="h-56 bg-[#15171d]"
          style={
            company.coverImageUrl
              ? { backgroundImage: `url(${company.coverImageUrl})` }
              : { background: `linear-gradient(135deg, ${accentColor}33, #15171d)` }
          }
        />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#15171d] text-emerald-200">
                {company.logoUrl ? (
                  <img
                    alt=""
                    className="h-full w-full rounded-md object-cover"
                    src={company.logoUrl}
                  />
                ) : (
                  <Building2 size={28} />
                )}
              </div>
              <div>
                <p className="text-sm text-emerald-200">{company.nicheLabel}</p>
                <h1 className="mt-1 text-3xl font-semibold">{company.tradingName}</h1>
                <p className="mt-2 text-sm text-white/60">
                  {[company.city, company.state].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
            <PrimaryLink icon={PlusCircle} to={`/empresa/${company.slug}/orcamento`}>
              Solicitar orcamento
            </PrimaryLink>
          </div>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/70">
            {company.description ?? company.headline ?? "Perfil publico da empresa."}
          </p>
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <ProfileSection title="Servicos">
            {company.services.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {company.services.map((service) => (
                  <div
                    className="rounded-md border border-white/10 bg-white/[0.04] p-4"
                    key={service.name}
                  >
                    <h3 className="font-medium">{service.name}</h3>
                    {service.description ? (
                      <p className="mt-2 text-sm text-white/60">{service.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/55">
                Servicos serao informados no perfil.
              </p>
            )}
          </ProfileSection>
          <ProfileSection title="Galeria">
            {company.gallery.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {company.gallery.map((item) => (
                  <img
                    alt={item.alt ?? ""}
                    className="aspect-[4/3] rounded-md border border-white/10 object-cover"
                    key={item.url}
                    src={item.url}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/55">Galeria ainda nao informada.</p>
            )}
          </ProfileSection>
        </section>
        <aside className="space-y-4">
          <InfoBlock
            label="Atendimento"
            value={
              company.serviceCities.length > 0
                ? company.serviceCities.join(", ")
                : "Regiao definida pela empresa"
            }
          />
          <InfoBlock
            label="Raio"
            value={
              company.serviceRadiusKm !== null
                ? `${company.serviceRadiusKm} km`
                : "Nao informado"
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
            label="Avaliacoes"
            value={
              company.reviewSummary.count > 0
                ? `${company.reviewSummary.average} de 5`
                : "Sem avaliacoes publicas"
            }
          />
        </aside>
      </div>
    </article>
  );
}

function ProfileSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm<LoginRequest>({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const loginMutation = useMutation({
    mutationFn: async (values: LoginRequest) => {
      const parsed = loginRequestSchema.safeParse(values);

      if (!parsed.success) {
        throw new Error("Revise e-mail e senha.");
      }

      return apiRequest<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
    },
    onSuccess(response) {
      if (response.user.role === "admin") {
        navigate("/admin");
        return;
      }

      if (response.user.role === "company") {
        navigate("/app/pendente");
        return;
      }

      navigate("/");
    },
  });

  async function onSubmit(values: LoginRequest) {
    setFormError(null);

    try {
      await loginMutation.mutateAsync(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Falha no login.");
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Acesso" title="Entrar na plataforma" />
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            autoComplete="email"
            label="E-mail"
            type="email"
            {...register("email", { required: true })}
          />
          <TextField
            autoComplete="current-password"
            label="Senha"
            type="password"
            {...register("password", { required: true })}
          />
          <SubmitButton
            icon={LogIn}
            isLoading={formState.isSubmitting || loginMutation.isPending}
          >
            Entrar
          </SubmitButton>
          <FormError message={formError} />
        </form>
      </main>
    </AppShell>
  );
}

function RegisterCompanyPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState, setValue, watch } =
    useForm<RegisterCompanyRequest>({
      defaultValues: {
        name: "",
        email: "",
        phone: "",
        password: "",
        companyName: "",
        companySlug: "",
      },
    });
  const [formError, setFormError] = useState<string | null>(null);
  const companyName = watch("companyName");
  const registerMutation = useMutation({
    mutationFn: async (values: RegisterCompanyRequest) => {
      const parsed = registerCompanyRequestSchema.safeParse({
        ...values,
        phone: values.phone?.trim() ? values.phone : undefined,
        companySlug: values.companySlug.toLowerCase(),
      });

      if (!parsed.success) {
        throw new Error("Revise os dados do cadastro.");
      }

      return apiRequest<{ user: AuthUser; companyId: string }>(
        "/api/auth/register/company",
        {
          method: "POST",
          body: JSON.stringify(parsed.data),
        },
      );
    },
    onSuccess() {
      navigate("/app/pendente");
    },
  });

  function suggestSlug() {
    setValue("companySlug", slugify(companyName), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(values: RegisterCompanyRequest) {
    setFormError(null);

    try {
      await registerMutation.mutateAsync(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Falha no cadastro.");
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Empresa" title="Cadastro empresarial" />
        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <TextField label="Nome do responsavel" {...register("name")} />
          <TextField label="E-mail" type="email" {...register("email")} />
          <TextField label="Telefone" {...register("phone")} />
          <TextField label="Senha" type="password" {...register("password")} />
          <TextField
            className="md:col-span-2"
            label="Nome comercial"
            {...register("companyName")}
          />
          <div className="md:col-span-2">
            <div className="flex items-end gap-2">
              <TextField
                className="flex-1"
                label="Slug publico"
                {...register("companySlug")}
              />
              <button
                className="h-11 rounded-md border border-white/15 px-4 text-sm text-white/80 hover:bg-white/10"
                type="button"
                onClick={suggestSlug}
              >
                Sugerir
              </button>
            </div>
          </div>
          <div className="md:col-span-2">
            <SubmitButton
              icon={PlusCircle}
              isLoading={formState.isSubmitting || registerMutation.isPending}
            >
              Criar cadastro
            </SubmitButton>
            <FormError message={formError} />
          </div>
        </form>
      </main>
    </AppShell>
  );
}

function CompanyAreaPage() {
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

const quoteRequestStatusLabels: Record<QuoteRequestStatus, string> = {
  draft: "Rascunho",
  submitted: "Recebida",
  under_review: "Em revisao",
  awaiting_information: "Aguardando dados",
  accepted_for_proposal: "Aceita para proposta",
  declined_by_company: "Recusada",
  cancelled: "Cancelada",
  archived: "Arquivada",
};

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
        createProposalError={createProposalMutation.error}
        declineError={declineMutation.error}
        detail={detailQuery.data?.quoteRequest ?? null}
        isCreatingProposal={createProposalMutation.isPending}
        isDeclining={declineMutation.isPending}
        isLoading={detailQuery.isLoading}
        isSendingProposal={sendProposalMutation.isPending}
        isReviewing={reviewMutation.isPending}
        reviewError={reviewMutation.error}
        sendProposalError={sendProposalMutation.error}
        onCreateProposal={(quoteRequestId, body) =>
          createProposalMutation.mutate({ quoteRequestId, body })
        }
        onDecline={(id, body) => declineMutation.mutate({ id, body })}
        onReview={(id, body) => reviewMutation.mutate({ id, body })}
        onSendProposal={(quoteRequestId, proposalId) =>
          sendProposalMutation.mutate({ quoteRequestId, proposalId })
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
  createProposalError,
  declineError,
  detail,
  isCreatingProposal,
  isDeclining,
  isLoading,
  isSendingProposal,
  isReviewing,
  reviewError,
  sendProposalError,
  onCreateProposal,
  onDecline,
  onReview,
  onSendProposal,
}: {
  createProposalError: unknown;
  declineError: unknown;
  detail: CompanyQuoteRequestDetail | null;
  isCreatingProposal: boolean;
  isDeclining: boolean;
  isLoading: boolean;
  isSendingProposal: boolean;
  isReviewing: boolean;
  reviewError: unknown;
  sendProposalError: unknown;
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
  onSendProposal: (quoteRequestId: string, proposalId: string) => void;
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
      createProposalError={createProposalError}
      declineError={declineError}
      isCreatingProposal={isCreatingProposal}
      isDeclining={isDeclining}
      isSendingProposal={isSendingProposal}
      isReviewing={isReviewing}
      quoteRequest={detail}
      reviewError={reviewError}
      sendProposalError={sendProposalError}
      onCreateProposal={onCreateProposal}
      onDecline={onDecline}
      onReview={onReview}
      onSendProposal={onSendProposal}
    />
  );
}

function CompanyQuoteRequestDetailView({
  createProposalError,
  declineError,
  isCreatingProposal,
  isDeclining,
  isSendingProposal,
  isReviewing,
  quoteRequest,
  reviewError,
  sendProposalError,
  onCreateProposal,
  onDecline,
  onReview,
  onSendProposal,
}: {
  createProposalError: unknown;
  declineError: unknown;
  isCreatingProposal: boolean;
  isDeclining: boolean;
  isSendingProposal: boolean;
  isReviewing: boolean;
  quoteRequest: CompanyQuoteRequestDetail;
  reviewError: unknown;
  sendProposalError: unknown;
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
  onSendProposal: (quoteRequestId: string, proposalId: string) => void;
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
    !hasAcceptedVersion;

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

const proposalVersionStatusLabels: Record<QuoteVersionStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  expired: "Expirada",
  superseded: "Substituida",
};

function ProposalVersionStatusBadge({ status }: { status: QuoteVersionStatus }) {
  const classByStatus: Record<QuoteVersionStatus, string> = {
    draft: "border-white/15 bg-white/[0.04] text-white/65",
    sent: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    viewed: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    accepted: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    rejected: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    expired: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    superseded: "border-white/15 bg-white/[0.04] text-white/50",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${classByStatus[status]}`}
    >
      {proposalVersionStatusLabels[status]}
    </span>
  );
}

function QuoteRequestStatusBadge({ status }: { status: QuoteRequestStatus }) {
  const classByStatus: Record<QuoteRequestStatus, string> = {
    draft: "border-white/15 bg-white/[0.04] text-white/60",
    submitted: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    under_review: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    awaiting_information: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    accepted_for_proposal: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    declined_by_company: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    cancelled: "border-white/15 bg-white/[0.04] text-white/60",
    archived: "border-white/15 bg-white/[0.04] text-white/60",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${classByStatus[status]}`}
    >
      {quoteRequestStatusLabels[status]}
    </span>
  );
}

function formatDurationMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}min`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function AdminCompaniesPage() {
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "all">("all");
  const companiesQuery = useQuery({
    queryKey: ["admin-companies", statusFilter],
    queryFn: () => {
      const search = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      return apiRequest<{ companies: AdminCompanySummary[] }>(
        `/api/admin/companies${search}`,
      );
    },
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Admin" title="Empresas" />
          <label className="text-sm text-white/70">
            Status
            <select
              className="ml-3 rounded-md border border-white/15 bg-[#15171d] px-3 py-2 text-white"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as CompanyStatus | "all")
              }
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="active">Ativas</option>
              <option value="suspended">Suspensas</option>
            </select>
          </label>
        </div>
        {companiesQuery.isLoading ? <LoadingLine /> : null}
        {companiesQuery.error ? (
          <ErrorPanel error={companiesQuery.error} fallback="Acesso Admin necessario." />
        ) : null}
        {companiesQuery.data ? (
          <section className="mt-6 overflow-hidden rounded-md border border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-white/[0.06] text-white/70">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Responsavel</th>
                  <th className="px-4 py-3 font-medium">Conta</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Cadastro</th>
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {companiesQuery.data.companies.map((company) => (
                  <tr className="bg-white/[0.02]" key={company.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{company.tradingName}</div>
                      <div className="text-white/45">{company.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {company.ownerName ?? "Sem responsavel"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={company.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ProfileBadge status={company.profileStatus} />
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {formatDate(company.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="inline-flex rounded-md border border-white/15 px-3 py-2 text-white/80 hover:bg-white/10"
                        to={`/admin/empresas/${company.id}`}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}

function AdminCompanyDetailPage() {
  const { companyId } = useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const companyQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company", companyId],
    queryFn: () =>
      apiRequest<{ company: AdminCompanyDetail }>(
        `/api/admin/companies/${String(companyId)}`,
      ),
  });
  const templatesQuery = useQuery({
    queryKey: ["admin-niche-templates"],
    queryFn: () =>
      apiRequest<{ templates: NicheTemplate[] }>("/api/admin/niche-templates"),
  });
  const actionMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "suspend" | "publish" | "notes";
      published?: boolean;
    }) => {
      if (!companyId) {
        throw new Error("Empresa nao encontrada.");
      }

      const payload =
        input.action === "notes"
          ? internalNoteRequestSchema.parse({
              note: note.trim(),
            })
          : input.action === "publish"
            ? adminPublishCompanyRequestSchema.parse({
                published: Boolean(input.published),
                note: note.trim() || undefined,
              })
            : adminCompanyActionRequestSchema.parse({
                note: note.trim() || undefined,
              });
      const path =
        input.action === "notes"
          ? `/api/admin/companies/${companyId}/notes`
          : `/api/admin/companies/${companyId}/${input.action}`;

      return apiRequest<{ company: AdminCompanyDetail }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async onSuccess() {
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-company", companyId] });
    },
  });
  const profileMutation = useMutation({
    mutationFn: async (input: AdminCompanyPublicProfileRequest) => {
      if (!companyId) {
        throw new Error("Empresa nao encontrada.");
      }

      return apiRequest<{ company: AdminCompanyDetail }>(
        `/api/admin/companies/${companyId}/profile`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
      );
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-company", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["public-companies"] });
      await queryClient.invalidateQueries({ queryKey: ["public-company"] });
    },
  });

  const company = companyQuery.data?.company;
  const canPublish = company?.status === "active";
  const actionError = actionMutation.error
    ? errorMessage(actionMutation.error, "Nao foi possivel aplicar a acao.")
    : null;
  const profileError = profileMutation.error
    ? errorMessage(profileMutation.error, "Nao foi possivel salvar o perfil.")
    : null;

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link className="text-sm text-white/60 underline" to="/admin">
          Voltar para empresas
        </Link>
        {companyQuery.isLoading ? <LoadingLine /> : null}
        {companyQuery.error ? (
          <ErrorPanel error={companyQuery.error} fallback="Empresa nao encontrada." />
        ) : null}
        {company ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold">{company.tradingName}</h1>
                  <p className="mt-2 text-sm text-white/55">{company.ownerEmail}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={company.status} />
                  <ProfileBadge status={company.profileStatus} />
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InfoBlock label="Slug" value={company.slug} />
                <InfoBlock label="Timezone" value={company.timezone} />
                <InfoBlock label="Criada em" value={formatDate(company.createdAt)} />
                <InfoBlock
                  label="Razao social"
                  value={company.legalName ?? "Nao informado"}
                />
                <InfoBlock
                  label="Documento"
                  value={company.documentNumber ?? "Nao informado"}
                />
                <InfoBlock
                  label="Ativacao"
                  value={
                    company.activatedAt ? formatDate(company.activatedAt) : "Pendente"
                  }
                />
              </div>
              <div className="mt-8">
                <AdminConfigurationPanel
                  company={company}
                  isLoadingTemplates={templatesQuery.isLoading}
                  templates={templatesQuery.data?.templates ?? []}
                  templatesError={
                    templatesQuery.error
                      ? errorMessage(
                          templatesQuery.error,
                          "Nao foi possivel carregar templates.",
                        )
                      : null
                  }
                />
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-semibold">Auditoria</h2>
                <Timeline
                  empty="Nenhuma acao administrativa registrada."
                  items={company.auditLogs.map((auditLog) => ({
                    id: auditLog.id,
                    title: auditLog.action,
                    detail: auditLog.actorName ?? "Sistema",
                    date: auditLog.createdAt,
                  }))}
                />
              </div>
            </section>
            <aside className="space-y-6">
              <AdminPublicProfileForm
                error={profileError}
                isLoading={profileMutation.isPending}
                profile={company.publicProfile}
                onSubmit={(values) => profileMutation.mutate(values)}
              />
              <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-lg font-semibold">Acoes</h2>
                <textarea
                  className="mt-4 min-h-28 w-full rounded-md border border-white/15 bg-[#15171d] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
                  placeholder="Observacao interna"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <div className="mt-4 grid gap-2">
                  <ActionButton
                    icon={CheckCircle2}
                    isLoading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ action: "activate" })}
                  >
                    Ativar
                  </ActionButton>
                  <ActionButton
                    icon={Ban}
                    isLoading={actionMutation.isPending}
                    variant="warning"
                    onClick={() => actionMutation.mutate({ action: "suspend" })}
                  >
                    Suspender
                  </ActionButton>
                  <ActionButton
                    disabled={!canPublish}
                    icon={Globe2}
                    isLoading={actionMutation.isPending}
                    onClick={() =>
                      actionMutation.mutate({ action: "publish", published: true })
                    }
                  >
                    Publicar
                  </ActionButton>
                  <ActionButton
                    icon={CircleSlash2}
                    isLoading={actionMutation.isPending}
                    variant="secondary"
                    onClick={() =>
                      actionMutation.mutate({ action: "publish", published: false })
                    }
                  >
                    Despublicar
                  </ActionButton>
                  <ActionButton
                    icon={FileText}
                    isLoading={actionMutation.isPending}
                    variant="secondary"
                    onClick={() => actionMutation.mutate({ action: "notes" })}
                  >
                    Salvar observacao
                  </ActionButton>
                </div>
                <FormError message={actionError} />
              </section>
              <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-lg font-semibold">Observacoes</h2>
                <Timeline
                  empty="Nenhuma observacao interna."
                  items={company.notes.map((item) => ({
                    id: item.id,
                    title: item.note,
                    detail: item.authorName ?? "Admin",
                    date: item.createdAt,
                  }))}
                />
              </section>
            </aside>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}

function AdminConfigurationPanel({
  company,
  isLoadingTemplates,
  templates,
  templatesError,
}: {
  company: AdminCompanyDetail;
  isLoadingTemplates: boolean;
  templates: NicheTemplate[];
  templatesError: string | null;
}) {
  const queryClient = useQueryClient();
  const draftConfiguration =
    company.configurations.find((configuration) => configuration.status === "draft") ??
    null;
  const publishedConfiguration =
    company.configurations.find(
      (configuration) => configuration.status === "published",
    ) ?? null;
  const [workingConfiguration, setWorkingConfiguration] =
    useState<CompanyConfigurationDetail | null>(
      draftConfiguration ?? publishedConfiguration,
    );
  const [cleaningSimulation, setCleaningSimulation] = useState(defaultCleaningSimulation);
  const selectedConfiguration =
    workingConfiguration ?? draftConfiguration ?? publishedConfiguration;
  const selectedTemplate =
    templates.find((template) => template.id === selectedConfiguration?.templateId) ??
    templates.find((template) => template.code === company.publicProfile.nicheCode) ??
    templates.find((template) => template.code === "cleaning_upholstery") ??
    null;
  const isEditable = selectedConfiguration?.status === "draft";

  useEffect(() => {
    setWorkingConfiguration(draftConfiguration ?? publishedConfiguration);
  }, [draftConfiguration, publishedConfiguration]);

  async function invalidateCompany() {
    await queryClient.invalidateQueries({ queryKey: ["admin-company", company.id] });
    await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  }

  async function saveConfiguration(configuration: CompanyConfigurationDetail) {
    const payload = adminUpdateCompanyConfigurationRequestSchema.parse(
      toConfigurationUpdatePayload(configuration),
    );
    const response = await apiRequest<{ configuration: CompanyConfigurationDetail }>(
      `/api/admin/company-configurations/${configuration.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );

    setWorkingConfiguration(response.configuration);
    return response.configuration;
  }

  const createConfigurationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) {
        throw new Error("Template de nicho nao encontrado.");
      }

      const payload = adminCreateCompanyConfigurationRequestSchema.parse({
        companyId: company.id,
        templateId: selectedTemplate.id,
      });

      return apiRequest<{ configuration: CompanyConfigurationDetail }>(
        "/api/admin/company-configurations",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    async onSuccess(response) {
      setWorkingConfiguration(response.configuration);
      await invalidateCompany();
    },
  });

  const saveConfigurationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConfiguration || selectedConfiguration.status !== "draft") {
        throw new Error("Somente rascunhos podem ser salvos.");
      }

      return saveConfiguration(selectedConfiguration);
    },
    async onSuccess() {
      await invalidateCompany();
    },
  });

  const simulateConfigurationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConfiguration) {
        throw new Error("Crie uma configuracao antes de simular.");
      }

      const configuration =
        selectedConfiguration.status === "draft"
          ? await saveConfiguration(selectedConfiguration)
          : selectedConfiguration;
      const payload = adminSimulateCompanyConfigurationRequestSchema.parse({
        answers: {
          item_type: cleaningSimulation.itemType,
          quantity: cleaningSimulation.quantity,
          size: cleaningSimulation.size,
          seats: cleaningSimulation.seats,
          fabric_type: cleaningSimulation.fabricType,
          dirt_level: cleaningSimulation.dirtLevel,
          has_stains: cleaningSimulation.hasStains,
          stain_type: cleaningSimulation.hasStains ? ["food"] : [],
          odor: cleaningSimulation.odor,
          pet_hair: cleaningSimulation.petHair,
          pets_present: cleaningSimulation.petsPresent,
          waterproofing: cleaningSimulation.waterproofing,
          urgency: cleaningSimulation.urgency,
          floor: cleaningSimulation.floor,
          has_elevator: cleaningSimulation.hasElevator,
          parking: cleaningSimulation.parking,
          distance_km: {
            originalValue: cleaningSimulation.distanceKm,
            originalUnit: "km",
            normalizedValue: String(cleaningSimulation.distanceKm),
            normalizedUnit: "km",
          },
        },
      });

      return apiRequest<{
        preview: CompanyConfigurationPreview;
        calculation: CalculationResult | null;
      }>(`/api/admin/company-configurations/${configuration.id}/simulate`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async onSuccess() {
      await invalidateCompany();
    },
  });

  const publishConfigurationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConfiguration || selectedConfiguration.status !== "draft") {
        throw new Error("Somente rascunhos podem ser publicados.");
      }

      const configuration = await saveConfiguration(selectedConfiguration);

      return apiRequest<{ configuration: CompanyConfigurationDetail }>(
        `/api/admin/company-configurations/${configuration.id}/publish`,
        {
          method: "POST",
        },
      );
    },
    async onSuccess(response) {
      setWorkingConfiguration(response.configuration);
      await invalidateCompany();
    },
  });

  function updateService(
    serviceId: string,
    patch: Partial<
      Pick<
        CompanyServiceConfiguration,
        | "isActive"
        | "schedulingMode"
        | "estimateMarginLowerBps"
        | "estimateMarginUpperBps"
        | "estimatedDurationMinutes"
      >
    >,
  ) {
    setWorkingConfiguration((current) =>
      current
        ? {
            ...current,
            services: current.services.map((service) =>
              service.id === serviceId ? { ...service, ...patch } : service,
            ),
          }
        : current,
    );
  }

  function updateField(
    serviceId: string,
    fieldId: string,
    patch: Partial<
      Pick<
        CompanyFieldConfiguration,
        | "helpText"
        | "isActive"
        | "isRequired"
        | "isClientVisible"
        | "isCompanyEditable"
        | "isPricingRelevant"
        | "requiresPhoto"
      >
    >,
  ) {
    setWorkingConfiguration((current) =>
      current
        ? {
            ...current,
            services: current.services.map((service) =>
              service.id === serviceId
                ? {
                    ...service,
                    fields: service.fields.map((field) =>
                      field.id === fieldId ? { ...field, ...patch } : field,
                    ),
                  }
                : service,
            ),
          }
        : current,
    );
  }

  function updateOption(
    serviceId: string,
    fieldId: string,
    optionId: string,
    patch: Partial<Pick<CompanyFieldOptionConfiguration, "isActive">>,
  ) {
    setWorkingConfiguration((current) =>
      current
        ? {
            ...current,
            services: current.services.map((service) =>
              service.id === serviceId
                ? {
                    ...service,
                    fields: service.fields.map((field) =>
                      field.id === fieldId
                        ? {
                            ...field,
                            options: field.options.map((option) =>
                              option.id === optionId ? { ...option, ...patch } : option,
                            ),
                          }
                        : field,
                    ),
                  }
                : service,
            ),
          }
        : current,
    );
  }

  function updatePricingRule(
    serviceId: string,
    pricingRuleId: string,
    patch: Partial<
      Pick<
        PricingRuleConfiguration,
        | "amountCents"
        | "isActive"
        | "percentageBps"
        | "multiplierBps"
        | "minimumValue"
        | "maximumValue"
        | "roundingIncrementCents"
        | "roundingMode"
      >
    >,
  ) {
    setWorkingConfiguration((current) =>
      current
        ? {
            ...current,
            services: current.services.map((service) =>
              service.id === serviceId
                ? {
                    ...service,
                    pricingRules: service.pricingRules.map((pricingRule) =>
                      pricingRule.id === pricingRuleId
                        ? { ...pricingRule, ...patch }
                        : pricingRule,
                    ),
                  }
                : service,
            ),
          }
        : current,
    );
  }

  function updateCleaningSimulation(patch: Partial<CleaningSimulationState>) {
    setCleaningSimulation((current) => ({ ...current, ...patch }));
  }

  const panelError =
    templatesError ??
    mutationErrorMessage(createConfigurationMutation.error) ??
    mutationErrorMessage(saveConfigurationMutation.error) ??
    mutationErrorMessage(simulateConfigurationMutation.error) ??
    mutationErrorMessage(publishConfigurationMutation.error);
  const preview = simulateConfigurationMutation.data?.preview ?? null;
  const calculation = simulateConfigurationMutation.data?.calculation ?? null;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Configuracao do template</h2>
          <p className="mt-1 text-sm text-white/55">
            {selectedTemplate
              ? `${selectedTemplate.name} v${selectedTemplate.version}`
              : "Template ainda nao carregado"}
          </p>
        </div>
        {selectedConfiguration ? (
          <span className="inline-flex items-center gap-2 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70">
            {selectedConfiguration.status !== "draft" ? <LockKeyhole size={14} /> : null}
            {configurationStatusLabels[selectedConfiguration.status]} v
            {selectedConfiguration.version}
          </span>
        ) : null}
      </div>

      {isLoadingTemplates ? <LoadingLine /> : null}
      {!selectedConfiguration ? (
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="text-sm leading-6 text-white/60">
            Nenhuma configuracao criada para esta empresa. O rascunho sera gerado a partir
            do template fixo do nicho piloto.
          </p>
          <ActionButton
            disabled={!selectedTemplate}
            icon={Settings2}
            isLoading={createConfigurationMutation.isPending}
            onClick={() => createConfigurationMutation.mutate()}
          >
            Criar rascunho
          </ActionButton>
        </div>
      ) : null}

      {selectedConfiguration ? (
        <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
          {!isEditable ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              <span>
                Esta versao esta publicada e imutavel. Crie um novo rascunho para alterar
                regras comerciais futuras.
              </span>
              <ActionButton
                disabled={!selectedTemplate}
                icon={Settings2}
                isLoading={createConfigurationMutation.isPending}
                variant="secondary"
                onClick={() => createConfigurationMutation.mutate()}
              >
                Novo rascunho
              </ActionButton>
            </div>
          ) : null}
          {selectedConfiguration.services.map((service) => (
            <div className="border-t border-white/10 pt-4" key={service.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  <p className="mt-1 text-xs text-white/45">{service.code}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ToggleLabel
                    checked={service.isActive}
                    disabled={!isEditable}
                    label="Ativo"
                    onChange={(checked) =>
                      updateService(service.id, { isActive: checked })
                    }
                  />
                  <label className="text-xs text-white/60">
                    Agendamento
                    <select
                      className="ml-2 rounded-md border border-white/15 bg-[#15171d] px-2 py-1.5 text-white"
                      disabled={!isEditable}
                      value={service.schedulingMode}
                      onChange={(event) =>
                        updateService(service.id, {
                          schedulingMode: event.target.value as SchedulingMode,
                        })
                      }
                    >
                      {Object.entries(schedulingModeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-4 grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-3">
                <label className="text-xs text-white/60">
                  Margem inferior (%)
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                    disabled={!isEditable}
                    inputMode="decimal"
                    value={bpsToPercentInput(service.estimateMarginLowerBps)}
                    onChange={(event) =>
                      updateService(service.id, {
                        estimateMarginLowerBps: percentInputToBps(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs text-white/60">
                  Margem superior (%)
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                    disabled={!isEditable}
                    inputMode="decimal"
                    value={bpsToPercentInput(service.estimateMarginUpperBps)}
                    onChange={(event) =>
                      updateService(service.id, {
                        estimateMarginUpperBps: percentInputToBps(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs text-white/60">
                  Duracao estimada (min)
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                    disabled={!isEditable}
                    inputMode="numeric"
                    value={service.estimatedDurationMinutes ?? ""}
                    onChange={(event) =>
                      updateService(service.id, {
                        estimatedDurationMinutes:
                          event.target.value.trim() === ""
                            ? null
                            : Math.max(1, Number(event.target.value)),
                      })
                    }
                  />
                </label>
              </div>
              {service.pricingRules.length > 0 ? (
                <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="text-sm font-medium text-white/85">Regras de preco</h4>
                  <div className="mt-3 divide-y divide-white/10">
                    {service.pricingRules.map((pricingRule) => (
                      <div
                        className="grid gap-3 py-3 lg:grid-cols-[1fr_120px_120px_120px]"
                        key={pricingRule.id}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ToggleLabel
                              checked={pricingRule.isActive}
                              disabled={!isEditable}
                              label={pricingRule.label}
                              onChange={(checked) =>
                                updatePricingRule(service.id, pricingRule.id, {
                                  isActive: checked,
                                })
                              }
                            />
                            <span className="text-xs text-white/40">
                              {pricingRule.ruleType}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/40">{pricingRule.code}</p>
                        </div>
                        <label className="text-xs text-white/55">
                          Valor
                          <input
                            className="mt-2 h-9 w-full rounded-md border border-white/15 bg-[#15171d] px-2 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                            disabled={!isEditable || pricingRule.amountCents === null}
                            inputMode="decimal"
                            value={
                              pricingRule.amountCents === null
                                ? ""
                                : centsToMoneyInput(pricingRule.amountCents)
                            }
                            onChange={(event) =>
                              updatePricingRule(service.id, pricingRule.id, {
                                amountCents: moneyInputToCents(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-white/55">
                          Percentual
                          <input
                            className="mt-2 h-9 w-full rounded-md border border-white/15 bg-[#15171d] px-2 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                            disabled={
                              !isEditable ||
                              (pricingRule.percentageBps === null &&
                                pricingRule.multiplierBps === null)
                            }
                            inputMode="decimal"
                            value={
                              pricingRule.multiplierBps !== null
                                ? bpsToPercentInput(pricingRule.multiplierBps)
                                : pricingRule.percentageBps !== null
                                  ? bpsToPercentInput(pricingRule.percentageBps)
                                  : ""
                            }
                            onChange={(event) =>
                              updatePricingRule(service.id, pricingRule.id, {
                                ...(pricingRule.multiplierBps !== null
                                  ? {
                                      multiplierBps: percentInputToBps(
                                        event.target.value,
                                      ),
                                    }
                                  : {
                                      percentageBps: percentInputToBps(
                                        event.target.value,
                                      ),
                                    }),
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-white/55">
                          Arredondar
                          <input
                            className="mt-2 h-9 w-full rounded-md border border-white/15 bg-[#15171d] px-2 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                            disabled={
                              !isEditable || pricingRule.roundingIncrementCents === null
                            }
                            inputMode="decimal"
                            value={
                              pricingRule.roundingIncrementCents === null
                                ? ""
                                : centsToMoneyInput(pricingRule.roundingIncrementCents)
                            }
                            onChange={(event) =>
                              updatePricingRule(service.id, pricingRule.id, {
                                roundingIncrementCents: moneyInputToCents(
                                  event.target.value,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 divide-y divide-white/10">
                {service.fields.map((field) => (
                  <div className="py-4" key={field.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{field.label}</div>
                        <div className="mt-1 text-xs text-white/45">
                          {field.code} - {field.fieldType}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ToggleLabel
                          checked={field.isActive}
                          disabled={!isEditable}
                          label="Ativo"
                          onChange={(checked) =>
                            updateField(service.id, field.id, { isActive: checked })
                          }
                        />
                        <ToggleLabel
                          checked={field.isRequired}
                          disabled={!isEditable}
                          label="Obrigatorio"
                          onChange={(checked) =>
                            updateField(service.id, field.id, { isRequired: checked })
                          }
                        />
                        <ToggleLabel
                          checked={field.isClientVisible}
                          disabled={!isEditable}
                          label="Cliente"
                          onChange={(checked) =>
                            updateField(service.id, field.id, {
                              isClientVisible: checked,
                            })
                          }
                        />
                        <ToggleLabel
                          checked={field.isPricingRelevant}
                          disabled={!isEditable}
                          label="Preco"
                          onChange={(checked) =>
                            updateField(service.id, field.id, {
                              isPricingRelevant: checked,
                            })
                          }
                        />
                        <ToggleLabel
                          checked={field.requiresPhoto}
                          disabled={!isEditable}
                          label="Foto"
                          onChange={(checked) =>
                            updateField(service.id, field.id, {
                              requiresPhoto: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                    {field.condition ? (
                      <p className="mt-2 text-xs text-sky-200">
                        Condicional: {field.condition.sourceFieldCode}{" "}
                        {field.condition.operator} {String(field.condition.value)}
                      </p>
                    ) : null}
                    <input
                      className="mt-3 h-10 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-sm text-white outline-none focus:border-emerald-300 disabled:text-white/45"
                      disabled={!isEditable}
                      placeholder="Texto de ajuda"
                      value={field.helpText ?? ""}
                      onChange={(event) =>
                        updateField(service.id, field.id, {
                          helpText: event.target.value.trim() || null,
                        })
                      }
                    />
                    {field.options.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {field.options.map((option) => (
                          <ToggleLabel
                            checked={option.isActive}
                            disabled={!isEditable}
                            key={option.id}
                            label={option.label}
                            onChange={(checked) =>
                              updateOption(service.id, field.id, option.id, {
                                isActive: checked,
                              })
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-white/85">Simulador de limpeza</h4>
            <div className="mt-3 grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-4">
              <SimulationSelect
                label="Item"
                options={cleaningSimulationSelectOptions.itemType}
                value={cleaningSimulation.itemType}
                onChange={(value) => updateCleaningSimulation({ itemType: value })}
              />
              <SimulationNumberInput
                label="Quantidade"
                min={1}
                value={cleaningSimulation.quantity}
                onChange={(value) => updateCleaningSimulation({ quantity: value })}
              />
              <SimulationSelect
                label="Tamanho"
                options={cleaningSimulationSelectOptions.size}
                value={cleaningSimulation.size}
                onChange={(value) => updateCleaningSimulation({ size: value })}
              />
              <SimulationNumberInput
                label="Lugares"
                min={1}
                value={cleaningSimulation.seats}
                onChange={(value) => updateCleaningSimulation({ seats: value })}
              />
              <SimulationSelect
                label="Tecido"
                options={cleaningSimulationSelectOptions.fabricType}
                value={cleaningSimulation.fabricType}
                onChange={(value) => updateCleaningSimulation({ fabricType: value })}
              />
              <SimulationSelect
                label="Sujeira"
                options={cleaningSimulationSelectOptions.dirtLevel}
                value={cleaningSimulation.dirtLevel}
                onChange={(value) => updateCleaningSimulation({ dirtLevel: value })}
              />
              <SimulationSelect
                label="Urgencia"
                options={cleaningSimulationSelectOptions.urgency}
                value={cleaningSimulation.urgency}
                onChange={(value) => updateCleaningSimulation({ urgency: value })}
              />
              <SimulationNumberInput
                label="Distancia (km)"
                min={0}
                value={cleaningSimulation.distanceKm}
                onChange={(value) => updateCleaningSimulation({ distanceKm: value })}
              />
              <SimulationNumberInput
                label="Andar"
                min={0}
                value={cleaningSimulation.floor}
                onChange={(value) => updateCleaningSimulation({ floor: value })}
              />
              <ToggleLabel
                checked={cleaningSimulation.hasElevator}
                disabled={false}
                label="Elevador"
                onChange={(checked) => updateCleaningSimulation({ hasElevator: checked })}
              />
              <ToggleLabel
                checked={cleaningSimulation.parking}
                disabled={false}
                label="Estacionamento"
                onChange={(checked) => updateCleaningSimulation({ parking: checked })}
              />
              <ToggleLabel
                checked={cleaningSimulation.hasStains}
                disabled={false}
                label="Manchas"
                onChange={(checked) => updateCleaningSimulation({ hasStains: checked })}
              />
              <ToggleLabel
                checked={cleaningSimulation.odor}
                disabled={false}
                label="Odor"
                onChange={(checked) => updateCleaningSimulation({ odor: checked })}
              />
              <ToggleLabel
                checked={cleaningSimulation.petHair}
                disabled={false}
                label="Pelos"
                onChange={(checked) => updateCleaningSimulation({ petHair: checked })}
              />
              <ToggleLabel
                checked={cleaningSimulation.petsPresent}
                disabled={false}
                label="Animais"
                onChange={(checked) => updateCleaningSimulation({ petsPresent: checked })}
              />
              <ToggleLabel
                checked={cleaningSimulation.waterproofing}
                disabled={false}
                label="Impermeabilizacao"
                onChange={(checked) =>
                  updateCleaningSimulation({ waterproofing: checked })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <ActionButton
              disabled={!isEditable}
              icon={Save}
              isLoading={saveConfigurationMutation.isPending}
              onClick={() => saveConfigurationMutation.mutate()}
            >
              Salvar rascunho
            </ActionButton>
            <ActionButton
              icon={Play}
              isLoading={simulateConfigurationMutation.isPending}
              variant="secondary"
              onClick={() => simulateConfigurationMutation.mutate()}
            >
              Simular
            </ActionButton>
            <ActionButton
              disabled={!isEditable}
              icon={Send}
              isLoading={publishConfigurationMutation.isPending}
              onClick={() => publishConfigurationMutation.mutate()}
            >
              Publicar versao
            </ActionButton>
          </div>
          {preview ? <ConfigurationPreview preview={preview} /> : null}
          {calculation ? <CalculationSummary calculation={calculation} /> : null}
        </div>
      ) : null}
      <FormError message={panelError} />
    </section>
  );
}

function ConfigurationPreview({ preview }: { preview: CompanyConfigurationPreview }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-sm font-medium text-white/85">Preview do pedido</h3>
      <div className="mt-3 space-y-3">
        {preview.services.map((service) => (
          <div className="rounded-md border border-white/10 p-3" key={service.id}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{service.name}</span>
              <span className="text-xs text-white/45">
                {schedulingModeLabels[service.schedulingMode]}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {service.fields.map((field) => (
                <div
                  className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  key={field.id}
                >
                  <div className="font-medium text-white/85">{field.label}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {field.isRequired ? "Obrigatorio" : "Opcional"} - {field.fieldType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalculationSummary({ calculation }: { calculation: CalculationResult }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-white/85">Estimativa simulada</h3>
          <p className="mt-1 text-xs text-white/45">
            Configuracao v{calculation.configurationVersion} - precos v
            {calculation.pricingVersion}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold text-emerald-200">
            {formatMoneyCents(calculation.estimateMinCents)} a{" "}
            {formatMoneyCents(calculation.estimateMaxCents)}
          </div>
          <div className="mt-1 text-xs text-white/45">
            Total interno {formatMoneyCents(calculation.internalTotalCents)}
          </div>
        </div>
      </div>
      <div className="mt-3 divide-y divide-white/10 rounded-md border border-white/10">
        {calculation.memory.map((line) => (
          <div
            className="grid gap-2 px-3 py-2 text-sm sm:grid-cols-[1fr_auto]"
            key={line.id}
          >
            <div>
              <div className="font-medium text-white/85">{line.label}</div>
              <div className="mt-1 text-xs text-white/45">{line.explanation}</div>
            </div>
            <div className={line.amountCents < 0 ? "text-rose-200" : "text-white/80"}>
              {formatMoneyCents(line.amountCents)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulationSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-white/60">
      {label}
      <select
        className="mt-2 h-10 w-full rounded-md border border-white/15 bg-[#15171d] px-2 text-sm text-white outline-none focus:border-emerald-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function SimulationNumberInput({
  label,
  min,
  value,
  onChange,
}: {
  label: string;
  min: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs text-white/60">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-sm text-white outline-none focus:border-emerald-300"
        inputMode="decimal"
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(Math.max(min, Number(event.target.value) || min))}
      />
    </label>
  );
}

function ToggleLabel({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/15 px-2.5 text-xs text-white/70">
      <input
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function toConfigurationUpdatePayload(configuration: CompanyConfigurationDetail) {
  return {
    services: configuration.services.map((service) => ({
      id: service.id,
      templateServiceId: service.templateServiceId,
      isActive: service.isActive,
      schedulingMode: service.schedulingMode,
      estimateMarginLowerBps: service.estimateMarginLowerBps,
      estimateMarginUpperBps: service.estimateMarginUpperBps,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
      displayOrder: service.displayOrder,
      pricingRules: service.pricingRules.map((pricingRule) => ({
        id: pricingRule.id,
        templatePricingRuleId: pricingRule.templatePricingRuleId,
        code: pricingRule.code,
        label: pricingRule.label,
        ruleType: pricingRule.ruleType,
        targetFieldCode: pricingRule.targetFieldCode,
        targetOptionCode: pricingRule.targetOptionCode,
        quantityFieldCode: pricingRule.quantityFieldCode,
        amountCents: pricingRule.amountCents,
        percentageBps: pricingRule.percentageBps,
        multiplierBps: pricingRule.multiplierBps,
        minimumValue: pricingRule.minimumValue,
        maximumValue: pricingRule.maximumValue,
        unit: pricingRule.unit,
        condition: pricingRule.condition,
        roundingMode: pricingRule.roundingMode,
        roundingIncrementCents: pricingRule.roundingIncrementCents,
        isActive: pricingRule.isActive,
        displayOrder: pricingRule.displayOrder,
      })),
      fields: service.fields.map((field) => ({
        id: field.id,
        templateFieldId: field.templateFieldId,
        isActive: field.isActive,
        isRequired: field.isRequired,
        isClientVisible: field.isClientVisible,
        isCompanyEditable: field.isCompanyEditable,
        isPricingRelevant: field.isPricingRelevant,
        requiresPhoto: field.requiresPhoto,
        displayOrder: field.displayOrder,
        helpText: field.helpText,
        options: field.options.map((option) => ({
          id: option.id,
          templateFieldOptionId: option.templateFieldOptionId,
          isActive: option.isActive,
          displayOrder: option.displayOrder,
        })),
      })),
    })),
  };
}

function centsToMoneyInput(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const whole = Math.floor(absoluteValue / 100);
  const cents = String(absoluteValue % 100).padStart(2, "0");

  return `${sign}${whole}.${cents}`;
}

function moneyInputToCents(value: string) {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return 0;
  }

  const [whole = "0", cents = ""] = normalized.split(".");
  return Number(`${whole}${cents.padEnd(2, "0").slice(0, 2)}`);
}

function bpsToPercentInput(value: number) {
  const whole = Math.floor(value / 100);
  const decimals = value % 100;

  return decimals === 0 ? String(whole) : `${whole}.${String(decimals).padStart(2, "0")}`;
}

function percentInputToBps(value: string) {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return 0;
  }

  const [whole = "0", decimals = ""] = normalized.split(".");
  return Number(`${whole}${decimals.padEnd(2, "0").slice(0, 2)}`);
}

function formatMoneyCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function formatMoneyInputFromCents(value: number) {
  return (value / 100).toFixed(2).replace(".", ",");
}

function parseMoneyInputToCents(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const [whole = "0", decimals = ""] = normalized.split(".");
  return Number(`${whole}${decimals.padEnd(2, "0").slice(0, 2)}`);
}

function formatDateTimeLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function parseDateTimeLocalInputToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addDaysToDate(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getLatestProposalSummary(proposals: CompanyProposalSummary[]) {
  return proposals
    .slice()
    .sort(
      (left, right) => (right.latestVersionNumber ?? 0) - (left.latestVersionNumber ?? 0),
    )[0];
}

function mutationErrorMessage(error: unknown) {
  return error ? errorMessage(error, "Nao foi possivel salvar a configuracao.") : null;
}

const configurationStatusLabels = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const schedulingModeLabels: Record<SchedulingMode, string> = {
  required_with_proposal: "Obrigatorio com proposta",
  optional_with_proposal: "Opcional com proposta",
  after_proposal_acceptance: "Depois do aceite",
  external_only: "Externo",
};

interface PublicProfileFormValues {
  nicheCode: PublicCompanyCategoryCode;
  headline: string;
  description: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  serviceRadiusKm: string;
  serviceCities: string;
  contactWhatsapp: string;
  services: string;
}

function AdminPublicProfileForm({
  error,
  isLoading,
  onSubmit,
  profile,
}: {
  error: string | null;
  isLoading: boolean;
  onSubmit: (values: AdminCompanyPublicProfileRequest) => void;
  profile: CompanyPublicProfileSettings;
}) {
  const { register, handleSubmit, reset } = useForm<PublicProfileFormValues>({
    defaultValues: toProfileFormValues(profile),
  });

  useEffect(() => {
    reset(toProfileFormValues(profile));
  }, [profile, reset]);

  function submit(values: PublicProfileFormValues) {
    const parsed = adminCompanyPublicProfileRequestSchema.parse({
      nicheCode: values.nicheCode,
      headline: emptyToUndefined(values.headline),
      description: emptyToUndefined(values.description),
      city: emptyToUndefined(values.city),
      state: emptyToUndefined(values.state),
      postalCode: emptyToUndefined(values.postalCode),
      neighborhood: profile.neighborhood ?? undefined,
      addressLine: profile.addressLine ?? undefined,
      addressComplement: profile.addressComplement ?? undefined,
      latitude: parseOptionalNumber(values.latitude),
      longitude: parseOptionalNumber(values.longitude),
      serviceRadiusKm: parseOptionalNumber(values.serviceRadiusKm),
      serviceCities: splitComma(values.serviceCities),
      serviceNeighborhoods: profile.serviceNeighborhoods,
      logoUrl: profile.logoUrl ?? undefined,
      coverImageUrl: profile.coverImageUrl ?? undefined,
      primaryColor: profile.primaryColor ?? undefined,
      contactPhone: profile.contactPhone ?? undefined,
      contactWhatsapp: emptyToUndefined(values.contactWhatsapp),
      contactEmail: profile.contactEmail ?? undefined,
      websiteUrl: profile.websiteUrl ?? undefined,
      instagramUrl: profile.instagramUrl ?? undefined,
      terms: profile.terms ?? undefined,
      gallery: profile.gallery,
      services: splitServices(values.services),
    });

    onSubmit(parsed);
  }

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-semibold">Perfil publico</h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit(submit)}>
        <label className="block text-sm text-white/70">
          Nicho
          <select
            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
            {...register("nicheCode")}
          >
            {PUBLIC_COMPANY_CATEGORIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Chamada curta" {...register("headline")} />
        <TextAreaField label="Descricao" rows={4} {...register("description")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Cidade" {...register("city")} />
          <TextField label="UF" {...register("state")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="CEP" {...register("postalCode")} />
          <TextField
            label="Raio em km"
            inputMode="decimal"
            {...register("serviceRadiusKm")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Latitude" inputMode="decimal" {...register("latitude")} />
          <TextField label="Longitude" inputMode="decimal" {...register("longitude")} />
        </div>
        <TextField
          label="Cidades atendidas"
          placeholder="Sao Paulo, Osasco"
          {...register("serviceCities")}
        />
        <TextField label="WhatsApp" {...register("contactWhatsapp")} />
        <TextAreaField
          label="Servicos"
          placeholder="Sofa - Limpeza completa"
          rows={4}
          {...register("services")}
        />
        <SubmitButton icon={Globe2} isLoading={isLoading}>
          Salvar perfil publico
        </SubmitButton>
        <FormError message={error} />
      </form>
    </section>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<OnboardingPage />} path="/onboarding" />
      <Route element={<CompaniesSearchPage />} path="/empresas" />
      <Route element={<PublicCompanyProfilePage />} path="/empresa/:slug" />
      <Route element={<QuoteRequestPage />} path="/empresa/:slug/orcamento" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<RegisterCompanyPage />} path="/cadastro/empresa" />
      <Route element={<CompanyAreaPage />} path="/app" />
      <Route element={<CompanyAreaPage />} path="/app/pendente" />
      <Route element={<AdminCompaniesPage />} path="/admin" />
      <Route element={<AdminCompanyDetailPage />} path="/admin/empresas/:companyId" />
    </Routes>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
    </div>
  );
}

const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
  }
>(({ className = "", label, ...props }, ref) => (
  <label className={`block text-sm text-white/70 ${className}`}>
    {label}
    <input
      className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none focus:border-emerald-300"
      ref={ref}
      {...props}
    />
  </label>
));
TextField.displayName = "TextField";

const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
  }
>(({ className = "", label, ...props }, ref) => (
  <label className={`block text-sm text-white/70 ${className}`}>
    {label}
    <textarea
      className="mt-2 w-full rounded-md border border-white/15 bg-[#15171d] px-3 py-3 text-white outline-none focus:border-emerald-300"
      ref={ref}
      {...props}
    />
  </label>
));
TextAreaField.displayName = "TextAreaField";

function PrimaryLink({
  children,
  icon: Icon,
  to,
}: {
  children: ReactNode;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-5 py-3 font-medium text-[#111216]"
      to={to}
    >
      <Icon size={18} />
      {children}
    </Link>
  );
}

function SecondaryLink({
  children,
  icon: Icon,
  to,
}: {
  children: ReactNode;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-medium text-white/85 hover:bg-white/10"
      to={to}
    >
      <Icon size={18} />
      {children}
    </Link>
  );
}

function SubmitButton({
  children,
  icon: Icon,
  isLoading,
}: {
  children: ReactNode;
  icon: LucideIcon;
  isLoading: boolean;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-300 px-5 py-2 font-medium text-[#111216] disabled:cursor-wait disabled:opacity-70"
      disabled={isLoading}
      type="submit"
    >
      <Icon size={18} />
      {isLoading ? "Aguarde" : children}
    </button>
  );
}

function ActionButton({
  children,
  disabled,
  icon: Icon,
  isLoading,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: LucideIcon;
  isLoading: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary" | "warning";
}) {
  const className = useMemo(() => {
    if (variant === "warning") {
      return "border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15";
    }

    if (variant === "secondary") {
      return "border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10";
    }

    return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15";
  }, [variant]);

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      disabled={disabled || isLoading}
      type="button"
      onClick={onClick}
    >
      <Icon size={18} />
      {isLoading ? "Processando" : children}
    </button>
  );
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  const labelByStatus: Record<CompanyStatus, string> = {
    pending: "Pendente",
    active: "Ativa",
    suspended: "Suspensa",
  };
  const classByStatus: Record<CompanyStatus, string> = {
    pending: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    active: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    suspended: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${classByStatus[status]}`}
    >
      {labelByStatus[status]}
    </span>
  );
}

function ProfileBadge({ status }: { status: AdminCompanySummary["profileStatus"] }) {
  const labels = {
    draft: "Rascunho",
    published: "Publicado",
    unpublished: "Despublicado",
  };

  return (
    <span className="inline-flex rounded-md border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-100">
      {labels[status]}
    </span>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className="mt-2 break-words text-sm text-white/85">{value}</div>
    </div>
  );
}

function Timeline({
  empty,
  items,
}: {
  empty: string;
  items: Array<{ id: string; title: string; detail: string; date: string }>;
}) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-white/50">{empty}</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li className="border-l border-white/15 pl-4" key={item.id}>
          <div className="text-sm font-medium text-white/90">{item.title}</div>
          <div className="mt-1 text-xs text-white/45">
            {item.detail} - {formatDate(item.date)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LoadingLine() {
  return <p className="mt-6 text-sm text-white/55">Carregando...</p>;
}

function ErrorPanel({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="mt-6 rounded-md border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">
      {errorMessage(error, fallback)}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  return message ? <p className="mt-3 text-sm text-rose-200">{message}</p> : null;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === "AUTH_NOT_CONFIGURED") {
      return "A API ainda nao esta configurada para autenticacao neste ambiente.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toProfileFormValues(
  profile: CompanyPublicProfileSettings,
): PublicProfileFormValues {
  return {
    nicheCode: profile.nicheCode,
    headline: profile.headline ?? "",
    description: profile.description ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    postalCode: profile.postalCode ?? "",
    latitude: profile.latitude === null ? "" : String(profile.latitude),
    longitude: profile.longitude === null ? "" : String(profile.longitude),
    serviceRadiusKm:
      profile.serviceRadiusKm === null ? "" : String(profile.serviceRadiusKm),
    serviceCities: profile.serviceCities.join(", "),
    contactWhatsapp: profile.contactWhatsapp ?? "",
    services: profile.services
      .map((service) =>
        service.description ? `${service.name} - ${service.description}` : service.name,
      )
      .join("\n"),
  };
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim().replace(",", ".");
  return trimmed ? Number(trimmed) : undefined;
}

function splitComma(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitServices(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...descriptionParts] = line.split(" - ");
      const description = descriptionParts.join(" - ").trim();

      return {
        name: (name ?? "").trim(),
        ...(description ? { description } : {}),
      };
    });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
