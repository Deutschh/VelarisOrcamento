import {
  loginRequestSchema,
  registerCompanyRequestSchema,
  registerCustomerRequestSchema,
  verifyEmailRequestSchema,
} from "@velaris/shared";
import type {
  AuthUser,
  LoginRequest,
  RegisterCompanyRequest,
  RegisterCustomerRequest,
} from "@velaris/shared";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LogIn,
  MailCheck,
  PlusCircle,
  Search,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  AppShell,
  FormError,
  SectionTitle,
  SubmitButton,
  TextField,
} from "../components/ui.js";
import { apiRequest, errorMessage } from "../lib/api.js";
import { slugify } from "../lib/formatters.js";
import { formatBrazilianPhoneInput } from "../lib/input-formatters.js";
import { useSession } from "../lib/session.js";

export function LoginPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [searchParams] = useSearchParams();
  const { register, handleSubmit, formState } = useForm<LoginRequest>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
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
      session.setAuthenticatedUser(response.user);

      if (response.user.role === "admin") {
        navigate("/admin");
        return;
      }

      if (response.user.role === "company") {
        navigate("/app/pendente");
        return;
      }

      navigate(searchParams.get("redirect") || "/servicos");
    },
  });

  async function onSubmit(values: LoginRequest) {
    setFormError(null);

    try {
      await loginMutation.mutateAsync(values);
    } catch (error) {
      setFormError(errorMessage(error, "Falha no login."));
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
            placeholder="voce@email.com"
            required
            type="email"
            {...register("email", { required: true })}
          />
          <TextField
            autoComplete="current-password"
            label="Senha"
            placeholder="Sua senha"
            required
            type="password"
            {...register("password", { required: true })}
          />
          <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">
            <input
              className="h-4 w-4 accent-[var(--color-accent)]"
              type="checkbox"
              {...register("rememberMe")}
            />
            Manter-me conectado neste dispositivo
          </label>
          <SubmitButton
            icon={LogIn}
            isLoading={formState.isSubmitting || loginMutation.isPending}
          >
            Entrar
          </SubmitButton>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
            to="/servicos"
          >
            <Search size={18} />
            Continuar como visitante
          </Link>
          <FormError message={formError} />
        </form>
        <div className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
          Ainda nao tem conta?{" "}
          <Link className="text-emerald-200 underline" to="/cadastro">
            Escolher cadastro
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

export function RegisterChoicePage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Cadastro" title="Escolha como deseja entrar" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            className="rounded-md border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-300/40 hover:bg-white/[0.07]"
            to="/cadastro/cliente"
          >
            <UserRound className="text-emerald-200" size={28} />
            <h2 className="mt-4 text-xl font-semibold">Cliente</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Acompanhe solicitacoes, propostas, horarios, favoritos e avaliacoes
              pendentes.
            </p>
          </Link>
          <Link
            className="rounded-md border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-300/40 hover:bg-white/[0.07]"
            to="/cadastro/empresa"
          >
            <Building2 className="text-emerald-200" size={28} />
            <h2 className="mt-4 text-xl font-semibold">Empresa</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Solicite ativacao para revisar pedidos, criar propostas e gerenciar
              atendimentos.
            </p>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

export function RegisterCustomerPage() {
  const navigate = useNavigate();
  const session = useSession();
  const { register, handleSubmit, formState, setValue } =
    useForm<RegisterCustomerRequest>({
      defaultValues: {
        name: "",
        email: "",
        phone: "",
        password: "",
      },
    });
  const [formError, setFormError] = useState<string | null>(null);
  const registerMutation = useMutation({
    mutationFn: async (values: RegisterCustomerRequest) => {
      const parsed = registerCustomerRequestSchema.safeParse({
        ...values,
        phone: values.phone?.trim() ? values.phone : undefined,
      });

      if (!parsed.success) {
        throw new Error("Revise os dados do cadastro.");
      }

      return apiRequest<{ user: AuthUser }>("/api/auth/register/customer", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
    },
    onSuccess(response) {
      session.setAuthenticatedUser(response.user);
      navigate("/servicos");
    },
  });

  async function onSubmit(values: RegisterCustomerRequest) {
    setFormError(null);

    try {
      await registerMutation.mutateAsync(values);
    } catch (error) {
      setFormError(errorMessage(error, "Falha no cadastro."));
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Cliente" title="Criar conta" />
        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <TextField
            autoComplete="name"
            className="md:col-span-2"
            label="Nome"
            placeholder="Seu nome completo"
            required
            {...register("name")}
          />
          <TextField
            autoComplete="email"
            label="E-mail"
            placeholder="voce@email.com"
            required
            type="email"
            {...register("email")}
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label="Telefone"
            placeholder="(11) 98147-9715"
            {...register("phone")}
            onChange={(event) =>
              setValue("phone", formatBrazilianPhoneInput(event.target.value), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <TextField
            autoComplete="new-password"
            className="md:col-span-2"
            label="Senha"
            placeholder="Mínimo de 8 caracteres"
            required
            type="password"
            {...register("password")}
          />
          <div className="md:col-span-2">
            <SubmitButton
              icon={PlusCircle}
              isLoading={formState.isSubmitting || registerMutation.isPending}
            >
              Criar conta
            </SubmitButton>
            <FormError message={formError} />
          </div>
        </form>
      </main>
    </AppShell>
  );
}

export function RegisterCompanyPage() {
  const navigate = useNavigate();
  const session = useSession();
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
    onSuccess(response) {
      session.setAuthenticatedUser(response.user);
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
      setFormError(errorMessage(error, "Falha no cadastro."));
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
          <TextField
            label="Nome do responsavel"
            placeholder="Nome de quem administrará a conta"
            required
            {...register("name")}
          />
          <TextField
            autoComplete="email"
            label="E-mail"
            placeholder="empresa@email.com"
            required
            type="email"
            {...register("email")}
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label="Telefone"
            placeholder="(11) 98147-9715"
            {...register("phone")}
            onChange={(event) =>
              setValue("phone", formatBrazilianPhoneInput(event.target.value), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <TextField
            autoComplete="new-password"
            label="Senha"
            placeholder="Mínimo de 8 caracteres"
            required
            type="password"
            {...register("password")}
          />
          <TextField
            className="md:col-span-2"
            label="Nome comercial"
            placeholder="Nome da sua empresa, ex: Velaris Studio"
            required
            {...register("companyName")}
          />
          <div className="md:col-span-2">
            <div className="flex items-end gap-2">
              <TextField
                className="flex-1"
                label="Slug publico"
                placeholder="velaris-studio"
                required
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
            <Link
              className="ml-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
              to="/login"
            >
              <ArrowRight size={18} />
              Já tenho login
            </Link>
            <FormError message={formError} />
          </div>
        </form>
      </main>
    </AppShell>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const parsed = verifyEmailRequestSchema.safeParse({ token });

      if (!parsed.success) {
        throw new Error("Link de verificação inválido.");
      }

      await apiRequest<void>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
    },
  });

  async function onVerify() {
    setFormError(null);

    try {
      await verifyMutation.mutateAsync();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Falha ao confirmar e-mail.");
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="Verificação" title="Confirmar e-mail" />
        <div className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-6">
          {verifyMutation.isSuccess ? (
            <>
              <CheckCircle2 className="text-emerald-200" size={32} />
              <h2 className="mt-4 text-xl font-semibold">E-mail confirmado</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Sua conta foi verificada com sucesso.
              </p>
              <Link
                className="mt-5 inline-flex rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
                to="/login"
              >
                Ir para login
              </Link>
            </>
          ) : (
            <>
              <MailCheck className="text-emerald-200" size={32} />
              <p className="mt-4 text-sm leading-6 text-white/65">
                Clique para confirmar o e-mail vinculado ao seu cadastro.
              </p>
              <button
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!token || verifyMutation.isPending}
                type="button"
                onClick={onVerify}
              >
                <MailCheck size={16} />
                {verifyMutation.isPending ? "Confirmando..." : "Confirmar e-mail"}
              </button>
              <FormError
                message={formError || (!token ? "Token ausente no link." : null)}
              />
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}
