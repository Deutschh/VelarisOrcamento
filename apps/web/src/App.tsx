import {
  adminCompanyActionRequestSchema,
  adminPublishCompanyRequestSchema,
  internalNoteRequestSchema,
  loginRequestSchema,
  registerCompanyRequestSchema,
} from "@velaris/shared";
import type {
  AdminCompanyDetail,
  AdminCompanySummary,
  AuthUser,
  CompanyAccountStatus,
  CompanyStatus,
  LoginRequest,
  RegisterCompanyRequest,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  CircleSlash2,
  ExternalLink,
  FileText,
  Globe2,
  LogIn,
  PlusCircle,
} from "lucide-react";
import { forwardRef, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
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

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <header className="border-b border-white/10 bg-[#111216]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="text-lg font-semibold" to="/">
            Velaris Orcamentos
          </Link>
          <nav className="flex items-center gap-2 text-sm text-white/70">
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
  return (
    <AppShell>
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        <section className="flex flex-col justify-center">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Sprint 3</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Ativacao manual e painel inicial da Velaris.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            Empresas podem criar conta, acompanhar o status pendente e aguardar a
            liberacao manual pelo Admin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink icon={PlusCircle} to="/cadastro/empresa">
              Cadastrar empresa
            </PrimaryLink>
            <SecondaryLink icon={LogIn} to="/login">
              Entrar
            </SecondaryLink>
          </div>
        </section>
        <section className="self-center rounded-md border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold">Fluxo atual</h2>
          <ol className="mt-5 space-y-4 text-sm text-white/70">
            <li>1. Cadastro empresarial com senha propria.</li>
            <li>2. Conta permanece pendente.</li>
            <li>3. Admin ativa, suspende e publica o perfil.</li>
            <li>4. Auditoria registra as acoes administrativas.</li>
          </ol>
        </section>
      </main>
    </AppShell>
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

  const company = companyQuery.data?.company;
  const canPublish = company?.status === "active";
  const actionError = actionMutation.error
    ? errorMessage(actionMutation.error, "Nao foi possivel aplicar a acao.")
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

export function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
