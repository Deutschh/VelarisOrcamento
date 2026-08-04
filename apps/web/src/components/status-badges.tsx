import type {
  AdminCompanySummary,
  AppointmentStatus,
  CompanyStatus,
  QuoteRequestStatus,
  QuoteVersionStatus,
} from "@velaris/shared";

export const quoteRequestStatusLabels: Record<QuoteRequestStatus, string> = {
  draft: "Rascunho",
  submitted: "Solicitação recebida",
  under_review: "Em análise",
  awaiting_information: "Aguardando informações",
  accepted_for_proposal: "Aceita para proposta",
  declined_by_company: "Recusada pela empresa",
  cancelled: "Cancelada",
  archived: "Arquivada",
};

export const proposalVersionStatusLabels: Record<QuoteVersionStatus, string> = {
  draft: "Rascunho",
  sent: "Proposta enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
  superseded: "Substituída",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  none: "Sem horário",
  proposed: "Horário proposto",
  confirmed: "Confirmado",
  reschedule_requested: "Alteração solicitada",
  rescheduled: "Reagendado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const neutralBadgeClass =
  "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]";

const subtleBadgeClass =
  "border-[var(--color-border-strong)] bg-[var(--color-surface-strong)] text-[var(--color-text-primary)]";

const successBadgeClass = "border-lime-300/30 bg-lime-300/10 text-lime-100";

const warningBadgeClass = "border-amber-300/30 bg-amber-300/10 text-amber-100";

const infoBadgeClass = "border-sky-300/30 bg-sky-300/10 text-sky-100";

const dangerBadgeClass = "border-rose-300/30 bg-rose-300/10 text-rose-100";

function BadgeShell({ children, className }: { children: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)] backdrop-blur-xl ${className}`}
    >
      {children}
    </span>
  );
}

export function ProposalVersionStatusBadge({ status }: { status: QuoteVersionStatus }) {
  const classByStatus: Record<QuoteVersionStatus, string> = {
    draft: neutralBadgeClass,
    sent: infoBadgeClass,
    viewed: subtleBadgeClass,
    accepted: successBadgeClass,
    rejected: dangerBadgeClass,
    expired: warningBadgeClass,
    superseded: neutralBadgeClass,
  };

  return (
    <BadgeShell className={classByStatus[status]}>
      {proposalVersionStatusLabels[status]}
    </BadgeShell>
  );
}

export function AppointmentStatusBadge({
  status,
}: {
  status: Exclude<AppointmentStatus, "none">;
}) {
  const classByStatus: Record<Exclude<AppointmentStatus, "none">, string> = {
    proposed: infoBadgeClass,
    confirmed: successBadgeClass,
    reschedule_requested: warningBadgeClass,
    rescheduled: subtleBadgeClass,
    completed: neutralBadgeClass,
    cancelled: dangerBadgeClass,
  };

  return (
    <BadgeShell className={classByStatus[status]}>
      {appointmentStatusLabels[status]}
    </BadgeShell>
  );
}

export function QuoteRequestStatusBadge({ status }: { status: QuoteRequestStatus }) {
  const classByStatus: Record<QuoteRequestStatus, string> = {
    draft: neutralBadgeClass,
    submitted: infoBadgeClass,
    under_review: warningBadgeClass,
    awaiting_information: subtleBadgeClass,
    accepted_for_proposal: successBadgeClass,
    declined_by_company: dangerBadgeClass,
    cancelled: neutralBadgeClass,
    archived: neutralBadgeClass,
  };

  return (
    <BadgeShell className={classByStatus[status]}>
      {quoteRequestStatusLabels[status]}
    </BadgeShell>
  );
}

export function StatusBadge({ status }: { status: CompanyStatus }) {
  const labelByStatus: Record<CompanyStatus, string> = {
    pending: "Pendente",
    active: "Ativa",
    suspended: "Suspensa",
  };

  const classByStatus: Record<CompanyStatus, string> = {
    pending: warningBadgeClass,
    active: successBadgeClass,
    suspended: dangerBadgeClass,
  };

  return (
    <BadgeShell className={classByStatus[status]}>{labelByStatus[status]}</BadgeShell>
  );
}

export function ProfileBadge({
  status,
}: {
  status: AdminCompanySummary["profileStatus"];
}) {
  const labels: Record<AdminCompanySummary["profileStatus"], string> = {
    draft: "Rascunho",
    published: "Publicado",
    unpublished: "Despublicado",
  };

  const classByStatus: Record<AdminCompanySummary["profileStatus"], string> = {
    draft: neutralBadgeClass,
    published: successBadgeClass,
    unpublished: warningBadgeClass,
  };

  return <BadgeShell className={classByStatus[status]}>{labels[status]}</BadgeShell>;
}
