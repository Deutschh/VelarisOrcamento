import {
  APP_DEFAULTS,
  type CompanyAppointment,
  type CompanyServiceConfiguration,
  type PublicProposalDetail,
} from "@velaris/shared";
import type { PersistedPublicCompany } from "./public-repository.js";
import type { PersistedQuoteRequest } from "./quote-request-repository.js";

interface ProposalPdfInput {
  company: PersistedPublicCompany;
  request: PersistedQuoteRequest;
  service: CompanyServiceConfiguration;
  proposal: PublicProposalDetail;
  appointment: CompanyAppointment | null;
  generatedAt: Date;
}

export interface GeneratedProposalPdf {
  fileName: string;
  contentType: "application/pdf";
  buffer: Buffer;
}

interface PdfLine {
  text: string;
  size?: number;
  font?: "regular" | "bold";
  gapBefore?: number;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 48;
const PAGE_BOTTOM = 46;

export function createPublicProposalPdf(input: ProposalPdfInput): GeneratedProposalPdf {
  const version = input.proposal.latestVersion;

  if (!version) {
    throw new Error("Proposal PDF requires a proposal version.");
  }

  const lines = createProposalPdfLines(input);
  const buffer = renderPdf(lines);

  return {
    fileName: `${safeFilePart(version.proposalCode)}.pdf`,
    contentType: "application/pdf",
    buffer,
  };
}

function createProposalPdfLines(input: ProposalPdfInput): PdfLine[] {
  const version = input.proposal.latestVersion;

  if (!version) {
    return [];
  }

  const hasCompanyTerms = Boolean(input.company.profile.terms?.trim());
  const lines: PdfLine[] = [];

  appendLine(lines, "Velaris Orcamentos", { font: "bold", size: 18 });
  appendLine(lines, "Proposta comercial", { font: "bold", size: 15 });
  appendLine(lines, `Gerado em ${formatDateTime(input.generatedAt)}`, {
    size: 9,
  });

  appendSection(lines, "Identificacao");
  appendField(lines, "Empresa", input.company.tradingName);
  appendField(lines, "Servico", input.service.name);
  appendField(lines, "Solicitacao", input.request.requestCode ?? "sem codigo");
  appendField(lines, "Proposta", version.proposalCode);
  appendField(lines, "Versao", String(version.versionNumber));
  appendField(lines, "Status", proposalStatusLabel(version.status));
  appendField(lines, "Enviada em", version.sentAt ? formatDateTime(version.sentAt) : "-");
  appendField(lines, "Validade", formatDateTime(version.validUntil));

  appendSection(lines, "Cliente");
  appendField(lines, "Nome", input.request.data.contact.name);
  appendField(lines, "WhatsApp", input.request.data.contact.whatsapp);
  appendField(lines, "E-mail", input.request.data.contact.email || "-");
  appendField(lines, "Endereco", formatRequestAddress(input.request.data.address));

  appendSection(lines, "Itens da proposta");
  for (const item of version.items.slice().sort(byDisplayOrder)) {
    appendWrapped(
      lines,
      `${item.displayOrder + 1}. ${item.label} | Quantidade: ${item.quantity} | Valor: ${formatMoneyCents(item.finalTotalCents)}`,
    );
  }
  appendField(lines, "Valor final", formatMoneyCents(version.finalTotalCents), {
    font: "bold",
  });
  appendField(
    lines,
    "Faixa estimada",
    `${formatMoneyCents(version.estimateMinCents)} a ${formatMoneyCents(
      version.estimateMaxCents,
    )}`,
  );
  if (version.outOfRangeReason) {
    appendField(lines, "Justificativa comercial", version.outOfRangeReason);
  }

  appendSection(lines, "Agendamento");
  appendAppointment(lines, input.appointment);

  appendSection(lines, "Termos e versoes");
  appendField(lines, "Termos da proposta", version.termsVersion);
  appendField(lines, "Politica de privacidade", APP_DEFAULTS.legalVersions.privacyPolicy);
  appendField(
    lines,
    "Aviso de estimativa",
    APP_DEFAULTS.legalVersions.estimateDisclaimer,
  );
  appendField(
    lines,
    "Termos da empresa",
    hasCompanyTerms ? APP_DEFAULTS.legalVersions.companyTerms : "nao informado",
  );
  if (version.terms) {
    appendWrapped(lines, version.terms);
  }
  if (input.company.profile.terms) {
    appendWrapped(lines, input.company.profile.terms);
  }

  appendSection(lines, "Aceite");
  if (input.proposal.acceptance) {
    appendField(lines, "Aceito em", formatDateTime(input.proposal.acceptance.acceptedAt));
    appendField(lines, "Versao aceita", input.proposal.acceptance.proposalCode);
    appendField(lines, "Registro", input.proposal.acceptance.id);
  } else {
    appendWrapped(
      lines,
      "Esta proposta ainda nao possui aceite registrado na plataforma.",
    );
  }

  appendWrapped(
    lines,
    "Documento gerado a partir da versao imutavel da proposta. Alteracoes comerciais posteriores devem gerar uma nova versao.",
    { size: 9, gapBefore: 12 },
  );

  return lines;
}

function appendAppointment(lines: PdfLine[], appointment: CompanyAppointment | null) {
  if (!appointment) {
    appendWrapped(
      lines,
      "Nenhum horario foi registrado pela plataforma para esta versao da proposta.",
    );
    return;
  }

  appendField(lines, "Status", appointmentStatusLabel(appointment.status));
  appendField(lines, "Inicio", formatDateTime(appointment.startsAt));
  appendField(
    lines,
    "Fim",
    appointment.endsAt ? formatDateTime(appointment.endsAt) : "-",
  );
  appendField(lines, "Duracao", `${appointment.durationMinutes} minutos`);
  appendField(lines, "Endereco", appointment.address ?? "-");
  if (appointment.notes) {
    appendField(lines, "Observacoes", appointment.notes);
  }
}

function appendSection(lines: PdfLine[], title: string) {
  appendLine(lines, title, { font: "bold", size: 13, gapBefore: 14 });
}

function appendField(
  lines: PdfLine[],
  label: string,
  value: string,
  options: Omit<PdfLine, "text"> = {},
) {
  appendWrapped(lines, `${label}: ${value}`, options);
}

function appendLine(lines: PdfLine[], text: string, options: Omit<PdfLine, "text"> = {}) {
  lines.push({ text, ...options });
}

function appendWrapped(
  lines: PdfLine[],
  text: string,
  options: Omit<PdfLine, "text"> = {},
) {
  const clean = normalizePdfText(text);
  const maxChars = options.size && options.size >= 13 ? 68 : 95;

  for (const paragraph of clean.split(/\r?\n/)) {
    const wrapped = wrapText(paragraph, maxChars);

    for (const [index, line] of wrapped.entries()) {
      const pdfLine: PdfLine = {
        text: line,
        ...options,
      };
      const gapBefore = index === 0 ? options.gapBefore : 0;

      if (gapBefore) {
        pdfLine.gapBefore = gapBefore;
      }

      lines.push(pdfLine);
    }
  }
}

function renderPdf(lines: PdfLine[]): Buffer {
  const pages = paginate(lines);
  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((content, index) => {
    const pageObjectId = 5 + index * 2;
    const contentObjectId = 6 + index * 2;
    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] =
      `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`;
  });

  return writePdfObjects(objects);
}

function paginate(lines: PdfLine[]) {
  const pages: string[] = [];
  let commands: string[] = ["BT"];
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  for (const line of lines) {
    const size = line.size ?? 10;
    const gapBefore = line.gapBefore ?? 0;
    const lineHeight = Math.ceil(size * 1.45);

    if (y - gapBefore - lineHeight < PAGE_BOTTOM) {
      commands.push("ET");
      pages.push(commands.join("\n"));
      commands = ["BT"];
      y = PAGE_HEIGHT - PAGE_MARGIN;
    }

    y -= gapBefore;
    commands.push(`/${line.font === "bold" ? "F2" : "F1"} ${size} Tf`);
    commands.push(`1 0 0 1 ${PAGE_MARGIN} ${y.toFixed(2)} Tm`);
    commands.push(`(${escapePdfString(line.text)}) Tj`);
    y -= lineHeight;
  }

  commands.push("ET");
  pages.push(commands.join("\n"));
  return pages;
}

function writePdfObjects(objects: string[]) {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "ascii");
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
}

function wrapText(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  lines.push(current);
  return lines;
}

function escapePdfString(value: string) {
  return normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMoneyCents(value: number) {
  return new Intl.NumberFormat(APP_DEFAULTS.locale, {
    style: "currency",
    currency: APP_DEFAULTS.currency,
  }).format(value / 100);
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat(APP_DEFAULTS.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_DEFAULTS.timezone,
  }).format(new Date(value));
}

function formatRequestAddress(address: PersistedQuoteRequest["data"]["address"]) {
  return (
    address.fullAddress ||
    [address.street, address.number, address.neighborhood, address.city, address.state]
      .filter(Boolean)
      .join(", ") ||
    "-"
  );
}

function byDisplayOrder(
  left: NonNullable<PublicProposalDetail["latestVersion"]>["items"][number],
  right: NonNullable<PublicProposalDetail["latestVersion"]>["items"][number],
) {
  return left.displayOrder - right.displayOrder;
}

function safeFilePart(value: string) {
  return normalizePdfText(value).replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function proposalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    sent: "enviada",
    viewed: "visualizada",
    accepted: "aceita",
    rejected: "recusada",
    expired: "expirada",
  };

  return labels[status] ?? status;
}

function appointmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    proposed: "proposto",
    confirmed: "confirmado",
    reschedule_requested: "reagendamento solicitado",
    rescheduled: "reagendado",
    completed: "concluido",
    cancelled: "cancelado",
  };

  return labels[status] ?? status;
}
