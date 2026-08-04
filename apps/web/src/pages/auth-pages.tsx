import {
  loginRequestSchema,
  registerCompanyRequestSchema,
  registerCustomerRequestSchema,
} from "@velaris/shared";
import type {
  AuthUser,
  LoginRequest,
  RegisterCompanyRequest,
  RegisterCustomerRequest,
} from "@velaris/shared";
import { useMutation } from "@tanstack/react-query";
import { Building2, LogIn, PlusCircle, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import {
  AppShell,
  FormError,
  SectionTitle,
  SubmitButton,
  TextField,
} from "../components/ui.js";
import { apiRequest } from "../lib/api.js";
import { slugify } from "../lib/formatters.js";

export function LoginPage() {
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

      navigate("/cliente");
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
  const { register, handleSubmit, formState } = useForm<RegisterCustomerRequest>({
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
    onSuccess() {
      navigate("/cliente");
    },
  });

  async function onSubmit(values: RegisterCustomerRequest) {
    setFormError(null);

    try {
      await registerMutation.mutateAsync(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Falha no cadastro.");
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
            {...register("name")}
          />
          <TextField
            autoComplete="email"
            label="E-mail"
            type="email"
            {...register("email")}
          />
          <TextField autoComplete="tel" label="Telefone" {...register("phone")} />
          <TextField
            autoComplete="new-password"
            className="md:col-span-2"
            label="Senha"
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
