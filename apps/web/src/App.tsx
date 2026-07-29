import {
  adminCompanyActionRequestSchema,
  adminCompanyPublicProfileRequestSchema,
  adminPublishCompanyRequestSchema,
  internalNoteRequestSchema,
  loginRequestSchema,
  PUBLIC_COMPANY_CATEGORIES,
  publicCompanySearchQuerySchema,
  registerCompanyRequestSchema,
} from "@velaris/shared";
import type {
  AdminCompanyPublicProfileRequest,
  AdminCompanyDetail,
  AdminCompanySummary,
  AuthUser,
  CompanyAccountStatus,
  CompanyPublicProfileSettings,
  CompanyStatus,
  LoginRequest,
  PublicCompanyCategoryCode,
  PublicCompanyDetail,
  PublicCompanySummary,
  RegisterCompanyRequest,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleSlash2,
  ExternalLink,
  FileText,
  Globe2,
  LocateFixed,
  LogIn,
  MapPin,
  PlusCircle,
  Search,
  Star,
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

function QuoteRequestPlaceholderPage() {
  const { slug } = useParams();

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Orcamento" title="Solicitar orcamento" />
        <section className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm leading-6 text-white/70">
            O pedido publico para esta empresa sera conectado ao fluxo de solicitacao
            quando as proximas etapas de rascunho e template estiverem prontas.
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            to={`/empresa/${String(slug)}`}
          >
            <ArrowRight size={16} />
            Voltar ao perfil
          </Link>
        </section>
      </main>
    </AppShell>
  );
}

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

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Empresa" title="Status do cadastro" />
        {accountQuery.isLoading ? <LoadingLine /> : null}
        {accountQuery.error ? (
          <ErrorPanel
            error={accountQuery.error}
            fallback="Entre como empresa para continuar."
          />
        ) : null}
        {accountQuery.data ? (
          <section className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {accountQuery.data.account.tradingName}
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {accountQuery.data.account.ownerEmail}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={accountQuery.data.account.status} />
                <ProfileBadge status={accountQuery.data.account.profileStatus} />
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoBlock label="Slug" value={accountQuery.data.account.slug} />
              <InfoBlock label="Papel" value={accountQuery.data.account.memberRole} />
              <InfoBlock
                label="Cadastro"
                value={formatDate(accountQuery.data.account.createdAt)}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {contactUrl ? (
                <a
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-4 py-2 font-medium text-[#111216]"
                  href={contactUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={18} />
                  Contato com a Velaris
                </a>
              ) : (
                <button
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-white/45"
                  disabled
                  type="button"
                >
                  <ExternalLink size={18} />
                  Contato com a Velaris
                </button>
              )}
              {accountQuery.data.account.status === "active" ? (
                <span className="rounded-md border border-emerald-300/30 px-4 py-2 text-sm text-emerald-200">
                  Acesso liberado
                </span>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
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
      <Route element={<QuoteRequestPlaceholderPage />} path="/empresa/:slug/orcamento" />
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
