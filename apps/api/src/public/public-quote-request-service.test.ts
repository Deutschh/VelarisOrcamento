import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PublicProposalDetail } from "@velaris/shared";

import { TemplateAdminService } from "../templates/template-service.js";
import type { EmailAdapter, RecoveryOtpMessage } from "../notifications/email-adapter.js";
import {
  InMemoryTemplateRepository,
  createTestNicheTemplate,
} from "../test/in-memory-template-repository.js";
import { InMemoryQuoteRequestRepository } from "../test/in-memory-quote-request-repository.js";
import { createDefaultPublicProfile } from "./public-profile.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";
import { PublicQuoteRequestService } from "./public-quote-request-service.js";

class InMemoryPublicCompanyRepository implements PublicCompanyRepository {
  constructor(private readonly companies: PersistedPublicCompany[]) {}

  async listPublishedCompanies() {
    return this.companies;
  }

  async findPublishedCompanyBySlug(slug: string) {
    return this.companies.find((company) => company.slug === slug) ?? null;
  }

  async findPublishedCompanyById(companyId: string) {
    return this.companies.find((company) => company.id === companyId) ?? null;
  }
}

async function createService(options: { now?: () => Date } = {}) {
  const companyId = "20000000-0000-4000-8000-000000000001";
  const templateRepository = new InMemoryTemplateRepository();
  const template = createTestNicheTemplate();
  templateRepository.templates.set(template.id, template);

  const templateService = new TemplateAdminService(templateRepository);
  const draftConfiguration = await templateService.createCompanyConfiguration(
    {
      companyId,
      templateId: template.id,
    },
    "10000000-0000-4000-8000-000000000001",
  );
  await templateService.publishConfiguration(
    draftConfiguration.id,
    "10000000-0000-4000-8000-000000000001",
  );

  const quoteRequestRepository = new InMemoryQuoteRequestRepository();
  const recoveryMessages: RecoveryOtpMessage[] = [];
  const emailAdapter: EmailAdapter = {
    async sendEmailVerification() {},
    async sendCompanyActivation() {},
    async sendQuoteRequestConfirmation() {},
    async sendRecoveryOtp(message) {
      recoveryMessages.push(message);
    },
  };
  const service = new PublicQuoteRequestService({
    publicCompanyRepository: new InMemoryPublicCompanyRepository([
      {
        id: companyId,
        tradingName: "Limpa Sofa",
        slug: "limpa-sofa",
        profile: {
          ...createDefaultPublicProfile(),
          city: "Sao Paulo",
          contactWhatsapp: "5511999990000",
        },
      },
    ]),
    templateRepository,
    quoteRequestRepository,
    emailAdapter,
    now: options.now ?? (() => new Date("2026-07-29T12:00:00.000Z")),
  });

  return {
    quoteRequestRepository,
    recoveryMessages,
    service,
  };
}

describe("PublicQuoteRequestService", () => {
  it("creates and resumes a server-side draft", async () => {
    const { service } = await createService();

    const created = await service.createDraft({ companySlug: "limpa-sofa" });
    const resumed = await service.getDraft(created.draftToken);

    expect(created.draft.status).toBe("draft");
    expect(resumed.draft.id).toBe(created.draft.id);
    expect(resumed.draft.data.items[0]?.itemType).toBe("sofa");
  });

  it("estimates multiple different item lines in the same draft", async () => {
    const { service } = await createService();
    const created = await service.createDraft({ companySlug: "limpa-sofa" });
    const firstItem = created.draft.data.items[0]!;

    await service.updateDraft(created.draftToken, {
      items: [
        {
          ...firstItem,
          label: "Sofa sala",
          dirtLevel: "heavy",
        },
        {
          ...firstItem,
          id: randomUUID(),
          label: "Sofa escritorio",
          dirtLevel: "light",
          hasStains: true,
        },
      ],
      access: {
        distanceKm: 12,
      },
    });

    const response = await service.estimateDraft(created.draftToken);

    expect(response.estimate.itemEstimates).toHaveLength(2);
    expect(
      response.estimate.requestAdjustments.some(
        (adjustment) => adjustment.ruleCode === "distance_fee",
      ),
    ).toBe(true);
  });

  it("submits a draft once for the same idempotency key", async () => {
    const { quoteRequestRepository, service } = await createService();
    const created = await service.createDraft({ companySlug: "limpa-sofa" });

    await service.updateDraft(created.draftToken, {
      contact: {
        name: "Cliente Teste",
        whatsapp: "11999990000",
      },
      address: {
        fullAddress: "Rua Teste, 123, Sao Paulo",
      },
    });

    const idempotencyKey = randomUUID();
    const first = await service.submitDraft(
      created.draftToken,
      {
        acceptedLegalTerms: true,
        idempotencyKey,
      },
      {},
    );
    const second = await service.submitDraft(
      created.draftToken,
      {
        acceptedLegalTerms: true,
        idempotencyKey,
      },
      {},
    );

    expect(second).toEqual(first);
    expect(quoteRequestRepository.idempotencyRecords.size).toBe(1);
    expect(Array.from(quoteRequestRepository.requests.values())[0]?.status).toBe(
      "submitted",
    );
  });

  it("opens public tracking with the token generated on submission", async () => {
    const { service } = await createService();
    const { response, publicToken } = await submitValidDraft(service);

    const tracking = await service.getTracking(publicToken);

    expect(tracking.quoteRequest.requestCode).toBe(response.requestCode);
    expect(tracking.company.name).toBe("Limpa Sofa");
    expect(tracking.whatsappUrl).toContain("wa.me");
  });

  it("recovers tracking access with request code, email and OTP", async () => {
    const { recoveryMessages, service } = await createService();
    const { publicToken, response } = await submitValidDraft(service);

    const recovery = await service.requestRecovery(
      {
        requestCode: response.requestCode,
        contact: "cliente@example.com",
      },
      {},
    );
    const otp = recoveryMessages[0]?.otp;

    expect(otp).toMatch(/^\d{6}$/);

    const verified = await service.verifyRecovery({
      requestCode: response.requestCode,
      recoveryToken: recovery.recoveryToken,
      otp: String(otp),
    });

    expect(verified.trackingPath).toContain("/acompanhar/");
    await expect(service.getTracking(verified.publicToken)).resolves.toMatchObject({
      quoteRequest: { requestCode: response.requestCode },
    });
    await expect(service.getTracking(publicToken)).rejects.toMatchObject({
      code: "PUBLIC_TRACKING_INVALID",
    });
  });

  it("uses WhatsApp only as complementary identification before sending OTP by email", async () => {
    const { recoveryMessages, service } = await createService();
    const { response } = await submitValidDraft(service);

    const recovery = await service.requestRecovery(
      {
        requestCode: response.requestCode,
        contact: "(11) 99999-0000",
      },
      {},
    );

    expect(recovery.contactMatchedBy).toBe("whatsapp");
    expect(recovery.deliveryChannel).toBe("email");
    expect(recoveryMessages[0]?.to).toBe("cliente@example.com");
  });

  it("rejects expired OTP recovery codes", async () => {
    let now = new Date("2026-07-29T12:00:00.000Z");
    const { recoveryMessages, service } = await createService({ now: () => now });
    const { response } = await submitValidDraft(service);

    const recovery = await service.requestRecovery(
      {
        requestCode: response.requestCode,
        contact: "cliente@example.com",
      },
      {},
    );

    now = new Date("2026-07-29T12:11:00.000Z");

    await expect(
      service.verifyRecovery({
        requestCode: response.requestCode,
        recoveryToken: recovery.recoveryToken,
        otp: String(recoveryMessages[0]?.otp),
      }),
    ).rejects.toMatchObject({ code: "PUBLIC_RECOVERY_OTP_EXPIRED" });
  });

  it("accepts a sent proposal and records the accepted version", async () => {
    const { quoteRequestRepository, service } = await createService();
    const { proposal, publicToken } = await submitDraftWithSentProposal(
      service,
      quoteRequestRepository,
    );

    const result = await service.acceptPublicProposal(
      publicToken,
      {
        acceptedLegalTerms: true,
      },
      {
        idempotencyKey: randomUUID(),
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      },
    );

    expect(result.proposal.status).toBe("accepted");
    expect(result.proposal.latestVersionStatus).toBe("accepted");
    expect(result.proposal.acceptedQuoteVersionId).toBe(proposal.latestVersionId);
    expect(result.proposal.acceptance).toMatchObject({
      quoteId: proposal.id,
      quoteVersionId: proposal.latestVersionId,
      proposalCode: proposal.latestProposalCode,
      finalTotalCents: proposal.finalTotalCents,
      termsVersion: "proposal_terms_v1",
    });
    expect(result.tracking.latestProposal?.latestVersionStatus).toBe("accepted");
    expect(quoteRequestRepository.proposalActionIdempotencyRecords.size).toBe(1);
    expect(
      Array.from(quoteRequestRepository.notifications.values()).some(
        (notification) => notification.type === "proposal_accepted_by_customer",
      ),
    ).toBe(true);
  });

  it("does not create a second acceptance for the same idempotency key", async () => {
    const { quoteRequestRepository, service } = await createService();
    const { publicToken } = await submitDraftWithSentProposal(
      service,
      quoteRequestRepository,
    );
    const idempotencyKey = randomUUID();

    const first = await service.acceptPublicProposal(
      publicToken,
      {
        acceptedLegalTerms: true,
      },
      {
        idempotencyKey,
      },
    );
    const second = await service.acceptPublicProposal(
      publicToken,
      {
        acceptedLegalTerms: true,
      },
      {
        idempotencyKey,
      },
    );

    expect(second.proposal.acceptance?.id).toBe(first.proposal.acceptance?.id);
    expect(second.proposal.latestVersionStatus).toBe("accepted");
    expect(quoteRequestRepository.proposalActionIdempotencyRecords.size).toBe(1);
  });

  it("does not accept expired proposals", async () => {
    const { quoteRequestRepository, service } = await createService();
    const { publicToken } = await submitDraftWithSentProposal(
      service,
      quoteRequestRepository,
      {
        validUntil: "2026-07-28T12:00:00.000Z",
      },
    );

    await expect(
      service.acceptPublicProposal(
        publicToken,
        {
          acceptedLegalTerms: true,
        },
        {
          idempotencyKey: randomUUID(),
        },
      ),
    ).rejects.toMatchObject({
      code: "PUBLIC_PROPOSAL_EXPIRED",
    });

    expect(quoteRequestRepository.proposalActionIdempotencyRecords.size).toBe(0);
    expect(
      Array.from(quoteRequestRepository.publicProposals.values())[0]?.acceptance,
    ).toBeNull();
  });

  it("does not reject a proposal after it has been accepted", async () => {
    const { quoteRequestRepository, service } = await createService();
    const { publicToken } = await submitDraftWithSentProposal(
      service,
      quoteRequestRepository,
    );

    await service.acceptPublicProposal(
      publicToken,
      {
        acceptedLegalTerms: true,
      },
      {
        idempotencyKey: randomUUID(),
      },
    );

    await expect(
      service.rejectPublicProposal(
        publicToken,
        {
          idempotencyKey: randomUUID(),
          reasonCode: "price",
        },
        {},
      ),
    ).rejects.toMatchObject({
      code: "PUBLIC_PROPOSAL_ALREADY_DECIDED",
    });
  });
});

async function submitValidDraft(service: PublicQuoteRequestService) {
  const created = await service.createDraft({ companySlug: "limpa-sofa" });
  await service.updateDraft(created.draftToken, {
    contact: {
      name: "Cliente Teste",
      whatsapp: "11999990000",
      email: "cliente@example.com",
    },
    address: {
      fullAddress: "Rua Teste, 123, Sao Paulo",
    },
  });

  const response = await service.submitDraft(
    created.draftToken,
    {
      acceptedLegalTerms: true,
      idempotencyKey: randomUUID(),
    },
    {},
  );
  const publicToken = response.trackingPath.split("/").at(-1);

  if (!publicToken) {
    throw new Error("Tracking token was not generated.");
  }

  return { publicToken, response };
}

async function submitDraftWithSentProposal(
  service: PublicQuoteRequestService,
  quoteRequestRepository: InMemoryQuoteRequestRepository,
  options: { validUntil?: string } = {},
) {
  const submitted = await submitValidDraft(service);
  const request = Array.from(quoteRequestRepository.requests.values()).find(
    (candidate) => candidate.requestCode === submitted.response.requestCode,
  );

  if (!request?.requestCode) {
    throw new Error("Submitted quote request was not stored.");
  }

  const quoteId = randomUUID();
  const quoteVersionId = randomUUID();
  const sentAt = "2026-07-29T12:05:00.000Z";
  const validUntil = options.validUntil ?? "2026-08-05T12:00:00.000Z";
  const proposalCode = `ORC-${request.requestCode}-V1`;

  const proposal: PublicProposalDetail = {
    id: quoteId,
    quoteRequestId: request.id,
    companyId: request.companyId,
    status: "sent",
    latestVersionId: quoteVersionId,
    latestVersionNumber: 1,
    latestProposalCode: proposalCode,
    latestVersionStatus: "sent",
    finalTotalCents: 12345,
    validUntil,
    sentAt,
    acceptedQuoteVersionId: null,
    createdAt: sentAt,
    updatedAt: sentAt,
    latestVersion: {
      id: quoteVersionId,
      quoteId,
      quoteRequestId: request.id,
      companyId: request.companyId,
      versionNumber: 1,
      proposalCode,
      status: "sent",
      estimateMinCents: request.estimateMinCents ?? 11000,
      estimateMaxCents: request.estimateMaxCents ?? 13000,
      finalTotalCents: 12345,
      outOfRangeReason: null,
      validUntil,
      terms: "Proposta válida conforme análise técnica.",
      termsVersion: "proposal_terms_v1",
      sentAt,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      expiredAt: null,
      items: [
        {
          id: randomUUID(),
          quoteVersionId,
          itemId: request.data.items[0]?.id ?? null,
          label: "Limpeza de sofá",
          quantity: 1,
          finalTotalCents: 12345,
          snapshot: {
            source: "test",
          },
          displayOrder: 0,
          createdAt: sentAt,
          updatedAt: sentAt,
        },
      ],
      createdAt: sentAt,
      updatedAt: sentAt,
    },
    acceptance: null,
  };

  quoteRequestRepository.publicProposals.set(request.id, proposal);
  quoteRequestRepository.proposals.set(request.id, [proposal]);

  return {
    ...submitted,
    proposal,
    request,
  };
}
