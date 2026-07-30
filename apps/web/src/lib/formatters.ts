import type {
  CompanyAppointment,
  CompanyProposalSummary,
  CompanyQuoteRequestDetail,
  QuoteDraftData,
} from "@velaris/shared";

import { errorMessage } from "./api.js";

export function formatMoneyCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function formatMoneyInputFromCents(value: number) {
  return (value / 100).toFixed(2).replace(".", ",");
}

export function parseMoneyInputToCents(value: string) {
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

export function formatDateTimeLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function parseDateTimeLocalInputToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function addDaysToDate(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getLatestProposalSummary(proposals: CompanyProposalSummary[]) {
  return proposals
    .slice()
    .sort(
      (left, right) => (right.latestVersionNumber ?? 0) - (left.latestVersionNumber ?? 0),
    )[0];
}

export function getLatestAppointment(appointments: CompanyAppointment[]) {
  return appointments
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )[0];
}

export function hasRequiredAppointmentForProposal(
  quoteRequest: CompanyQuoteRequestDetail,
) {
  if (quoteRequest.service.schedulingMode !== "required_with_proposal") {
    return true;
  }

  return quoteRequest.appointments.some((appointment) =>
    ["proposed", "rescheduled", "confirmed"].includes(appointment.status),
  );
}

export function formatQuoteAddress(address: QuoteDraftData["address"]) {
  return (
    address.fullAddress ||
    [address.street, address.number, address.neighborhood, address.city, address.state]
      .filter(Boolean)
      .join(", ")
  );
}

export function formatAppointmentWindow(appointment: CompanyAppointment) {
  const start = formatDate(appointment.startsAt);
  return appointment.endsAt ? `${start} ate ${formatDate(appointment.endsAt)}` : start;
}

export function formatDurationMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}min`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function mutationErrorMessage(error: unknown) {
  return error ? errorMessage(error, "Nao foi possivel salvar a configuracao.") : null;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
