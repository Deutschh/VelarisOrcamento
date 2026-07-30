import { describe, expect, it } from "vitest";
import { quoteDraftDataSchema, type QuoteDraftData } from "@velaris/shared";
import { calculateQuoteDraftData } from "../quote-requests/quote-request-calculation.js";
import { InMemoryCompanyAccountRepository } from "../test/in-memory-company-account-repository.js";
import { InMemoryCompanyAppointmentRepository } from "../test/in-memory-company-appointment-repository.js";
import { InMemoryCompanyProposalRepository } from "../test/in-memory-company-proposal-repository.js";
import { InMemoryCompanyQuoteRequestRepository } from "../test/in-memory-company-quote-request-repository.js";
import {
  InMemoryTemplateRepository,
  createTestNicheTemplate,
} from "../test/in-memory-template-repository.js";
import { TemplateAdminService } from "../templates/template-service.js";
import type { PersistedCompanyQuoteRequest } from "./company-quote-request-repository.js";
import { CompanyProposalService } from "./company-proposal-service.js";

const companyId = "20000000-0000-4000-8000-000000000001";
const companyUserId = "20000000-0000-4000-8000-000000000101";
const adminUserId = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-07-29T13:00:00.000Z");

async function createService() {
  const accountRepository = new InMemoryCompanyAccountRepository();
  accountRepository.accounts.set(companyUserId, {
    companyId,
    tradingName: "Limpa Sofa",
    slug: "limpa-sofa",
    status: "active",
    profileStatus: "published",
    memberRole: "owner",
    ownerEmail: "empresa@example.com",
    activatedAt: now,
    suspendedAt: null,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
  });

  const templateRepository = new InMemoryTemplateRepository();
  const template = createTestNicheTemplate();
  templateRepository.templates.set(template.id, template);

  const templateService = new TemplateAdminService(templateRepository);
  const draftConfiguration = await templateService.createCompanyConfiguration(
    {
      companyId,
      templateId: template.id,
    },
    adminUserId,
  );
  const configuration = await templateService.publishConfiguration(
    draftConfiguration.id,
    adminUserId,
  );
  const companyService = configuration.services[0]!;
  const data = createDraftData();
  const { calculation, summary } = calculateQuoteDraftData({
    configuration,
    service: companyService,
    data,
    calculatedAt: now,
  });
  const quoteRequestRepository = new InMemoryCompanyQuoteRequestRepository();
  const quoteRequest: PersistedCompanyQuoteRequest = {
    id: "30000000-0000-4000-8000-000000000001",
    requestCode: "VEL-260729-TESTE001",
    companyId,
    companyTimezone: "America/Sao_Paulo",
    companyConfigurationId: configuration.id,
    companyServiceId: companyService.id,
    companyPricingVersionId: configuration.pricingVersion?.id ?? null,
    status: "accepted_for_proposal",
    serviceName: companyService.name,
    serviceSchedulingMode: companyService.schedulingMode,
    serviceEstimatedDurationMinutes: companyService.estimatedDurationMinutes,
    data,
    files: [],
    revisions: [],
    events: [],
    proposals: [],
    appointments: [],
    calculationSnapshot: {
      ...calculation.snapshot,
      summary,
    },
    internalTotalCents: calculation.internalTotalCents,
    estimateMinCents: calculation.estimateMinCents,
    estimateMaxCents: calculation.estimateMaxCents,
    submittedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  quoteRequestRepository.requests.set(quoteRequest.id, quoteRequest);

  const proposalRepository = new InMemoryCompanyProposalRepository();
  const appointmentRepository = new InMemoryCompanyAppointmentRepository();

  return {
    appointmentRepository,
    proposalRepository,
    quoteRequest,
    quoteRequestRepository,
    service: new CompanyProposalService({
      accountRepository,
      quoteRequestRepository,
      proposalRepository,
      appointmentRepository,
      now: () => now,
    }),
  };
}

describe("CompanyProposalService", () => {
  it("creates a draft proposal version with the internal total suggested", async () => {
    const { quoteRequest, service } = await createService();

    const response = await service.createProposalVersion(companyUserId, quoteRequest.id, {
      terms: "Termos comerciais iniciais.",
    });
    const version = response.proposal.versions[0]!;

    expect(response.proposal.status).toBe("draft");
    expect(version.versionNumber).toBe(1);
    expect(version.proposalCode).toBe("ORC-260729-TESTE001-V1");
    expect(version.finalTotalCents).toBe(quoteRequest.internalTotalCents);
    expect(version.outOfRangeReason).toBeNull();
    expect(version.items).toHaveLength(quoteRequest.data.items.length);
    expect(version.validUntil).toBe("2026-08-05T13:00:00.000Z");
  });

  it("requires a reason outside the estimate range and preserves previous versions", async () => {
    const { quoteRequest, service } = await createService();
    await service.createProposalVersion(companyUserId, quoteRequest.id, {});
    const outsideRangeTotal = (quoteRequest.estimateMaxCents ?? 0) + 1000;

    await expect(
      service.createProposalVersion(companyUserId, quoteRequest.id, {
        finalTotalCents: outsideRangeTotal,
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_PROPOSAL_OUT_OF_RANGE_REASON_REQUIRED",
    });

    const response = await service.createProposalVersion(companyUserId, quoteRequest.id, {
      finalTotalCents: outsideRangeTotal,
      outOfRangeReason: "Fotos mostram sujeira intensa.",
    });

    expect(response.proposal.versions).toHaveLength(2);
    expect(response.proposal.versions[0]?.versionNumber).toBe(2);
    expect(response.proposal.versions[1]?.versionNumber).toBe(1);
    expect(response.proposal.versions[1]?.status).toBe("superseded");
  });

  it("sends the latest draft version idempotently", async () => {
    const { appointmentRepository, quoteRequest, proposalRepository, service } =
      await createService();
    const created = await service.createProposalVersion(
      companyUserId,
      quoteRequest.id,
      {},
    );
    const version = created.proposal.versions[0]!;
    await appointmentRepository.createAppointment({
      id: "50000000-0000-4000-8000-000000000001",
      quoteId: created.proposal.id,
      quoteVersionId: version.id,
      quoteRequestId: quoteRequest.id,
      companyId,
      actorUserId: companyUserId,
      schedulingMode: "required_with_proposal",
      proposalVersionStatus: version.status,
      startsAt: new Date("2026-07-30T13:00:00.000Z"),
      endsAt: new Date("2026-07-30T15:00:00.000Z"),
      durationMinutes: 120,
      timezone: "America/Sao_Paulo",
      address: "Rua Teste, 123, Sao Paulo",
      addressSnapshot: quoteRequest.data.address,
      notes: null,
      conflictWarning: [],
      now,
    });
    const idempotencyKey = "40000000-0000-4000-8000-000000000001";

    const first = await service.sendProposal(
      companyUserId,
      created.proposal.id,
      idempotencyKey,
    );
    const second = await service.sendProposal(
      companyUserId,
      created.proposal.id,
      idempotencyKey,
    );

    expect(first.proposal.latestVersionStatus).toBe("sent");
    expect(second.proposal.latestVersionId).toBe(first.proposal.latestVersionId);
    expect(proposalRepository.idempotencyRecords.size).toBe(1);
    expect(first.proposal.versions[0]?.events[0]?.eventType).toBe("proposal.sent");
  });

  it("blocks sending when scheduling is required and no appointment was proposed", async () => {
    const { quoteRequest, service } = await createService();
    const created = await service.createProposalVersion(
      companyUserId,
      quoteRequest.id,
      {},
    );

    await expect(
      service.sendProposal(
        companyUserId,
        created.proposal.id,
        "40000000-0000-4000-8000-000000000002",
      ),
    ).rejects.toMatchObject({
      code: "COMPANY_PROPOSAL_APPOINTMENT_REQUIRED",
    });
  });

  it("blocks proposal creation when the quote request is not ready", async () => {
    const { quoteRequest, quoteRequestRepository, service } = await createService();
    quoteRequestRepository.requests.set(quoteRequest.id, {
      ...quoteRequest,
      status: "submitted",
    });

    await expect(
      service.createProposalVersion(companyUserId, quoteRequest.id, {}),
    ).rejects.toMatchObject({
      code: "COMPANY_PROPOSAL_QUOTE_REQUEST_NOT_READY",
    });
  });

  it("blocks accepted versions from commercial replacement", async () => {
    const { quoteRequest, proposalRepository, service } = await createService();
    const created = await service.createProposalVersion(
      companyUserId,
      quoteRequest.id,
      {},
    );
    const acceptedVersion = created.proposal.versions[0]!;
    proposalRepository.proposals.set(created.proposal.id, {
      ...created.proposal,
      acceptedQuoteVersionId: acceptedVersion.id,
      versions: [
        {
          ...acceptedVersion,
          status: "accepted",
          acceptedAt: now.toISOString(),
        },
      ],
    });

    await expect(
      service.createProposalVersion(companyUserId, quoteRequest.id, {
        finalTotalCents: (quoteRequest.internalTotalCents ?? 0) + 1000,
        outOfRangeReason: "Nova condicao comercial.",
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_PROPOSAL_ACCEPTED_PROPOSAL_VERSION_LOCKED",
    });
  });

  it("rejects expired validity dates and allows proposals without appointment data", async () => {
    const { quoteRequest, service } = await createService();

    await expect(
      service.createProposalVersion(companyUserId, quoteRequest.id, {
        validUntil: "2026-07-29T12:59:59.000Z",
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_PROPOSAL_VALIDITY_NOT_IN_FUTURE",
    });

    const response = await service.createProposalVersion(companyUserId, quoteRequest.id, {
      validUntil: "2026-07-30T13:00:00.000Z",
    });

    expect(response.proposal.versions[0]?.snapshot).not.toHaveProperty("appointment");
  });
});

function createDraftData(): QuoteDraftData {
  return quoteDraftDataSchema.parse({
    currentStep: "submitted",
    items: [
      {
        id: "item-1",
        label: "Sofa da sala",
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
        petsPresent: true,
        waterproofing: false,
        notes: "Cliente enviou foto.",
      },
    ],
    address: {
      fullAddress: "Rua Teste, 123, Sao Paulo",
      city: "Sao Paulo",
      state: "SP",
    },
    access: {
      urgency: "normal",
      floor: 2,
      hasElevator: true,
      parking: true,
      distanceKm: 12,
    },
    contact: {
      name: "Cliente Teste",
      whatsapp: "11999990000",
      email: "cliente@example.com",
    },
    notes: "Preferencia por atendimento pela manha.",
  });
}
