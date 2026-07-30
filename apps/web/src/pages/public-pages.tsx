import {
  PUBLIC_COMPANY_CATEGORIES,
  createQuoteDraftRequestSchema,
  customerAppointmentActionRequestSchema,
  publicCompanySearchQuerySchema,
  publicTrackingRecoveryRequestSchema,
  publicTrackingRecoveryVerifyRequestSchema,
  quoteDraftFileMetadataRequestSchema,
  submitQuoteDraftRequestSchema,
  updateQuoteDraftRequestSchema,
} from "@velaris/shared";
import type {
  CompanyAppointment,
  CreateQuoteDraftResponse,
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
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { CheckboxField, SelectField } from "../components/form-controls.js";
import {
  ActionButton,
  AppShell,
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  PrimaryLink,
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
import { ApiError, apiRequest, errorMessage } from "../lib/api.js";
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
  parseIntegerInput,
  parseNumberInput,
} from "../lib/quote-form-options.js";
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

export function OnboardingPage() {
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
    const validationMessage = validateQuoteSubmissionDraft(draftData);

    if (validationMessage) {
      setFormError(validationMessage);
      setDraftData({
        ...draftData,
        currentStep:
          validationMessage === "Informe o endereco do atendimento."
            ? "details"
            : "contact",
      });
      return;
    }

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
              <PrimaryLink icon={ClipboardList} to={submitResult.trackingPath}>
                Acompanhar
              </PrimaryLink>
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

export function PublicTrackingPage() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const [rescheduleReason, setRescheduleReason] = useState("");
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
  const latestAppointment = tracking ? getLatestAppointment(tracking.appointments) : null;

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Acompanhamento" title="Sua solicitacao" />
          <SecondaryLink icon={KeyRound} to="/recuperar">
            Recuperar acesso
          </SecondaryLink>
        </div>
        {trackingQuery.isLoading ? <LoadingLine /> : null}
        {trackingQuery.error ? (
          <ErrorPanel
            error={trackingQuery.error}
            fallback="Nao foi possivel abrir o acompanhamento."
          />
        ) : null}
        {tracking ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-emerald-200">{tracking.company.name}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{tracking.service.name}</h2>
                  <p className="mt-2 text-sm text-white/55">
                    Codigo {tracking.quoteRequest.requestCode}
                  </p>
                </div>
                <QuoteRequestStatusBadge status={tracking.quoteRequest.status} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <InfoBlock
                  label="Enviada em"
                  value={formatDate(tracking.quoteRequest.submittedAt)}
                />
                <InfoBlock
                  label="Ultima atualizacao"
                  value={formatDate(tracking.quoteRequest.updatedAt)}
                />
                <InfoBlock
                  label="Estimativa"
                  value={
                    tracking.quoteRequest.estimate
                      ? `${formatMoneyCents(
                          tracking.quoteRequest.estimate.estimateMinCents,
                        )} a ${formatMoneyCents(
                          tracking.quoteRequest.estimate.estimateMaxCents,
                        )}`
                      : "Pendente"
                  }
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <section className="space-y-6">
                <PublicProposalPanel proposal={tracking.latestProposal} />
                <PublicAppointmentPanel
                  appointment={latestAppointment}
                  error={
                    appointmentMutation.error
                      ? errorMessage(
                          appointmentMutation.error,
                          "Nao foi possivel atualizar o horario.",
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
              </section>
              <aside className="space-y-6">
                <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-lg font-semibold">Contato da empresa</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Use o WhatsApp assistido para falar com a empresa sobre esta
                    solicitacao.
                  </p>
                  {tracking.whatsappUrl ? (
                    <a
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-300 px-4 py-3 text-sm font-medium text-[#111216]"
                      href={tracking.whatsappUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <MessageCircle size={18} />
                      Abrir WhatsApp
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-white/50">
                      WhatsApp nao informado no perfil publico.
                    </p>
                  )}
                </section>
                <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-lg font-semibold">Resumo do pedido</h2>
                  <div className="mt-4 space-y-3 text-sm text-white/65">
                    <p>{tracking.quoteRequest.data.items.length} item(ns)</p>
                    <p>{formatQuoteAddress(tracking.quoteRequest.data.address)}</p>
                    <p>{tracking.quoteRequest.data.notes || "Sem observacoes gerais."}</p>
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
  proposal,
}: {
  proposal: PublicTrackingResponse["latestProposal"];
}) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-xl font-semibold">Proposta</h2>
      {proposal ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoBlock label="Codigo" value={proposal.latestProposalCode ?? "Pendente"} />
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
          <InfoBlock
            label="Status"
            value={
              proposal.latestVersionStatus
                ? proposalVersionStatusLabels[proposal.latestVersionStatus]
                : "Pendente"
            }
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/55">
          A empresa ainda nao enviou uma proposta.
        </p>
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

function validateQuoteSubmissionDraft(data: QuoteDraftData) {
  if (!data.contact.name.trim()) {
    return "Informe o nome para contato.";
  }

  if (data.contact.whatsapp.trim().length < 8) {
    return "Informe o WhatsApp para contato.";
  }

  if (!hasQuoteSubmissionAddress(data)) {
    return "Informe o endereco do atendimento.";
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
