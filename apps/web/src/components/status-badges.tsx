import type {
  AdminCompanySummary,
  AppointmentStatus,
  CompanyStatus,
  QuoteRequestStatus,
  QuoteVersionStatus,
} from "@velaris/shared";

export const quoteRequestStatusLabels: Record<QuoteRequestStatus, string> = {
  draft: "Rascunho",
  submitted: "Recebida",
  under_review: "Em revisao",
  awaiting_information: "Aguardando dados",
  accepted_for_proposal: "Aceita para proposta",
  declined_by_company: "Recusada",
  cancelled: "Cancelada",
  archived: "Arquivada",
};

export const proposalVersionStatusLabels: Record<QuoteVersionStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  expired: "Expirada",
  superseded: "Substituida",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  none: "Sem horario",
  proposed: "Proposto",
  confirmed: "Confirmado",
  reschedule_requested: "Alteracao solicitada",
  rescheduled: "Reagendado",
  completed: "Concluido",
  cancelled: "Cancelado",
};

export function ProposalVersionStatusBadge({ status }: { status: QuoteVersionStatus }) {
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

export function AppointmentStatusBadge({
  status,
}: {
  status: Exclude<AppointmentStatus, "none">;
}) {
  const classByStatus: Record<Exclude<AppointmentStatus, "none">, string> = {
    proposed: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    confirmed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    reschedule_requested: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    rescheduled: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    completed: "border-white/15 bg-white/[0.04] text-white/60",
    cancelled: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${classByStatus[status]}`}
    >
      {appointmentStatusLabels[status]}
    </span>
  );
}

export function QuoteRequestStatusBadge({ status }: { status: QuoteRequestStatus }) {
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

export function StatusBadge({ status }: { status: CompanyStatus }) {
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

export function ProfileBadge({
  status,
}: {
  status: AdminCompanySummary["profileStatus"];
}) {
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
