import {
  PUBLIC_COMPANY_CATEGORIES,
  adminCompanyActionRequestSchema,
  adminCompanyPublicProfileRequestSchema,
  adminCreateCompanyConfigurationRequestSchema,
  adminPublishCompanyRequestSchema,
  adminSimulateCompanyConfigurationRequestSchema,
  adminUpdateCompanyConfigurationRequestSchema,
  internalNoteRequestSchema,
} from "@velaris/shared";
import type {
  AdminCompanyDetail,
  AdminCompanyPublicProfileRequest,
  AdminCompanySummary,
  CalculationResult,
  CompanyConfigurationDetail,
  CompanyFieldConfiguration,
  CompanyConfigurationPreview,
  CompanyFieldOptionConfiguration,
  CompanyPublicProfileSettings,
  CompanyServiceConfiguration,
  CompanyStatus,
  NicheTemplate,
  PricingRuleConfiguration,
  PublicCompanyCategoryCode,
  SchedulingMode,
} from "@velaris/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  CircleSlash2,
  FileText,
  Globe2,
  LockKeyhole,
  Play,
  Save,
  Send,
  Settings2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";

import {
  ActionButton,
  AppShell,
  ErrorPanel,
  FormError,
  InfoBlock,
  LoadingLine,
  SectionTitle,
  SubmitButton,
  TextAreaField,
  TextField,
  Timeline,
} from "../components/ui.js";
import { ProfileBadge, StatusBadge } from "../components/status-badges.js";
import { apiRequest, errorMessage } from "../lib/api.js";
import { formatDate, mutationErrorMessage } from "../lib/formatters.js";
import {
  type CleaningSimulationState,
  cleaningSimulationSelectOptions,
  defaultCleaningSimulation,
  schedulingModeLabels,
} from "../lib/quote-form-options.js";
export function AdminCompaniesPage() {
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

export function AdminCompanyDetailPage() {
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

const configurationStatusLabels = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
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
