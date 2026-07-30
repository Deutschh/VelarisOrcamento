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
import { CompanyAppointmentService } from "./company-appointment-service.js";
import { CompanyProposalService } from "./company-proposal-service.js";

const companyId = "20000000-0000-4000-8000-000000000001";
const companyUserId = "20000000-0000-4000-8000-000000000101";
const adminUserId = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-07-29T13:00:00.000Z");

async function createFixture(
  options: {
    schedulingMode?:
      | "required_with_proposal"
      | "optional_with_proposal"
      | "after_proposal_acceptance"
      | "external_only";
    estimatedDurationMinutes?: number | null;
  } = {},
) {
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
    serviceSchedulingMode: options.schedulingMode ?? "required_with_proposal",
    serviceEstimatedDurationMinutes: options.estimatedDurationMinutes ?? null,
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
  const proposalService = new CompanyProposalService({
    accountRepository,
    quoteRequestRepository,
    proposalRepository,
    appointmentRepository,
    now: () => now,
  });
  const appointmentService = new CompanyAppointmentService({
    accountRepository,
    quoteRequestRepository,
    proposalRepository,
    appointmentRepository,
    now: () => now,
  });
  const proposal = await proposalService.createProposalVersion(
    companyUserId,
    quoteRequest.id,
    {},
  );

  return {
    appointmentRepository,
    appointmentService,
    proposal: proposal.proposal,
    proposalRepository,
    quoteRequest,
  };
}

describe("CompanyAppointmentService", () => {
  it("proposes an appointment with company timezone and default duration", async () => {
    const { appointmentService, proposal } = await createFixture();

    const response = await appointmentService.proposeAppointment(
      companyUserId,
      proposal.id,
      {
        startsAt: "2026-07-30T13:00:00.000Z",
        notes: "Cliente prefere periodo da manha.",
      },
    );

    expect(response.appointment.status).toBe("proposed");
    expect(response.appointment.timezone).toBe("America/Sao_Paulo");
    expect(response.appointment.durationMinutes).toBe(120);
    expect(response.appointment.endsAt).toBe("2026-07-30T15:00:00.000Z");
    expect(response.appointment.history[0]?.eventType).toBe("appointment.proposed");
  });

  it("warns about overlapping appointments without blocking", async () => {
    const { appointmentRepository, appointmentService, proposal, quoteRequest } =
      await createFixture({ estimatedDurationMinutes: 90 });
    const version = proposal.versions[0]!;
    await appointmentRepository.createAppointment({
      id: "50000000-0000-4000-8000-000000000099",
      quoteId: "40000000-0000-4000-8000-000000000099",
      quoteVersionId: version.id,
      quoteRequestId: "30000000-0000-4000-8000-000000000099",
      companyId,
      actorUserId: companyUserId,
      schedulingMode: "optional_with_proposal",
      proposalVersionStatus: "sent",
      startsAt: new Date("2026-07-30T13:30:00.000Z"),
      endsAt: new Date("2026-07-30T15:00:00.000Z"),
      durationMinutes: 90,
      timezone: "America/Sao_Paulo",
      address: "Outro endereco",
      addressSnapshot: quoteRequest.data.address,
      notes: null,
      conflictWarning: [],
      now,
    });

    const response = await appointmentService.proposeAppointment(
      companyUserId,
      proposal.id,
      {
        startsAt: "2026-07-30T13:00:00.000Z",
      },
    );

    expect(response.appointment.status).toBe("proposed");
    expect(response.conflictWarning).toHaveLength(1);
    expect(response.appointment.conflictWarning).toHaveLength(1);
  });

  it("rejects platform scheduling for external-only services", async () => {
    const { appointmentService, proposal } = await createFixture({
      schedulingMode: "external_only",
    });

    await expect(
      appointmentService.proposeAppointment(companyUserId, proposal.id, {
        startsAt: "2026-07-30T13:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_APPOINTMENT_EXTERNAL_ONLY",
    });
  });

  it("allows after-acceptance scheduling only when the proposal version is accepted", async () => {
    const { appointmentService, proposal, proposalRepository } = await createFixture({
      schedulingMode: "after_proposal_acceptance",
    });

    await expect(
      appointmentService.proposeAppointment(companyUserId, proposal.id, {
        startsAt: "2026-07-30T13:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_APPOINTMENT_REQUIRES_ACCEPTED_PROPOSAL",
    });

    const version = proposal.versions[0]!;
    proposalRepository.proposals.set(proposal.id, {
      ...proposal,
      status: "accepted",
      acceptedQuoteVersionId: version.id,
      versions: [
        {
          ...version,
          status: "accepted",
          acceptedAt: now.toISOString(),
        },
      ],
    });

    const response = await appointmentService.proposeAppointment(
      companyUserId,
      proposal.id,
      {
        startsAt: "2026-07-30T13:00:00.000Z",
      },
    );

    expect(response.appointment.status).toBe("proposed");
    expect(response.appointment.proposalVersionStatus).toBe("accepted");
  });

  it("records customer reschedule requests and company rescheduled proposals", async () => {
    const { appointmentService, proposal } = await createFixture();
    const proposed = await appointmentService.proposeAppointment(
      companyUserId,
      proposal.id,
      {
        startsAt: "2026-07-30T13:00:00.000Z",
      },
    );
    const requested = await appointmentService.recordCustomerAppointmentAction({
      companyId,
      appointmentId: proposed.appointment.id,
      body: {
        action: "request_reschedule",
        reason: "Cliente prefere a tarde.",
      },
    });

    const rescheduled = await appointmentService.updateAppointment(
      companyUserId,
      requested.appointment.id,
      {
        action: "propose_new_time",
        startsAt: "2026-07-31T17:00:00.000Z",
        durationMinutes: 60,
      },
    );

    expect(requested.appointment.status).toBe("reschedule_requested");
    expect(rescheduled.appointment.status).toBe("rescheduled");
    expect(rescheduled.appointment.history[0]?.eventType).toBe("appointment.rescheduled");
  });

  it("completes only confirmed appointments", async () => {
    const { appointmentService, proposal } = await createFixture();
    const proposed = await appointmentService.proposeAppointment(
      companyUserId,
      proposal.id,
      {
        startsAt: "2026-07-30T13:00:00.000Z",
      },
    );

    await expect(
      appointmentService.completeAppointment(companyUserId, proposed.appointment.id),
    ).rejects.toMatchObject({
      code: "COMPANY_APPOINTMENT_TRANSITION_NOT_ALLOWED",
    });

    const confirmed = await appointmentService.recordCustomerAppointmentAction({
      companyId,
      appointmentId: proposed.appointment.id,
      body: {
        action: "confirm",
      },
    });
    const completed = await appointmentService.completeAppointment(
      companyUserId,
      confirmed.appointment.id,
    );

    expect(confirmed.appointment.status).toBe("confirmed");
    expect(completed.appointment.status).toBe("completed");
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
