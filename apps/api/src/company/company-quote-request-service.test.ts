import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { quoteDraftDataSchema, type QuoteDraftData } from "@velaris/shared";

import { calculateQuoteDraftData } from "../quote-requests/quote-request-calculation.js";
import { InMemoryCompanyAccountRepository } from "../test/in-memory-company-account-repository.js";
import { InMemoryCompanyQuoteRequestRepository } from "../test/in-memory-company-quote-request-repository.js";
import {
  InMemoryTemplateRepository,
  createTestNicheTemplate,
} from "../test/in-memory-template-repository.js";
import { TemplateAdminService } from "../templates/template-service.js";
import type { PersistedCompanyQuoteRequest } from "./company-quote-request-repository.js";
import { CompanyQuoteRequestService } from "./company-quote-request-service.js";

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
    status: "submitted",
    serviceName: companyService.name,
    serviceSchedulingMode: companyService.schedulingMode,
    serviceEstimatedDurationMinutes: companyService.estimatedDurationMinutes,
    data,
    files: [
      {
        id: randomUUID(),
        itemId: data.items[0]!.id,
        fieldCode: "photos",
        fileName: "sofa-sala.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        storageProvider: "stub",
        createdAt: now.toISOString(),
      },
    ],
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

  return {
    companyService,
    quoteRequest,
    quoteRequestRepository,
    service: new CompanyQuoteRequestService({
      accountRepository,
      quoteRequestRepository,
      templateRepository,
      now: () => now,
    }),
  };
}

describe("CompanyQuoteRequestService", () => {
  it("lists submitted quote requests with dashboard counts", async () => {
    const { companyService, quoteRequest, service } = await createService();

    const response = await service.listQuoteRequests(companyUserId, {});
    const detail = await service.getQuoteRequest(companyUserId, quoteRequest.id);

    expect(response.dashboard.receivedCount).toBe(1);
    expect(response.dashboard.submittedCount).toBe(1);
    expect(response.quoteRequests[0]?.requestCode).toBe("VEL-260729-TESTE001");
    expect(detail.quoteRequest.files[0]?.fileName).toBe("sofa-sala.jpg");
    expect(detail.quoteRequest.estimate?.internalTotalCents).toBeGreaterThan(0);
    expect(detail.quoteRequest.service.estimatedDurationMinutes).toBe(
      companyService.estimatedDurationMinutes,
    );
    expect(detail.quoteRequest.appointments).toEqual([]);
  });

  it("opens review and accepts a reviewed request for proposal", async () => {
    const { quoteRequest, service } = await createService();

    const opened = await service.reviewQuoteRequest(companyUserId, quoteRequest.id, {
      action: "open_review",
    });
    const accepted = await service.reviewQuoteRequest(companyUserId, quoteRequest.id, {
      action: "accept_for_proposal",
    });

    expect(opened.quoteRequest.status).toBe("under_review");
    expect(accepted.quoteRequest.status).toBe("accepted_for_proposal");
    expect(accepted.quoteRequest.events[0]?.eventType).toBe(
      "quote_request.accepted_for_proposal",
    );
  });

  it("requires a reason for technical changes and audits recalculation", async () => {
    const { quoteRequest, service } = await createService();
    await service.reviewQuoteRequest(companyUserId, quoteRequest.id, {
      action: "open_review",
    });
    const revisedData = {
      ...quoteRequest.data,
      items: [
        {
          ...quoteRequest.data.items[0]!,
          dirtLevel: "heavy",
          seats: 5,
        },
      ],
    };

    await expect(
      service.reviewQuoteRequest(companyUserId, quoteRequest.id, {
        action: "save_review",
        data: revisedData,
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_QUOTE_REVIEW_VALIDATION_ERROR",
    });

    const saved = await service.reviewQuoteRequest(companyUserId, quoteRequest.id, {
      action: "save_review",
      data: revisedData,
      reason: "Fotos indicam sujeira intensa e sofa maior.",
    });

    expect(saved.quoteRequest.status).toBe("under_review");
    expect(saved.quoteRequest.data.items[0]?.dirtLevel).toBe("heavy");
    expect(saved.quoteRequest.revisions.length).toBeGreaterThanOrEqual(2);
    expect(saved.quoteRequest.internalTotalCents).not.toBe(
      quoteRequest.internalTotalCents,
    );
    expect(saved.quoteRequest.events[0]?.eventType).toBe("quote_request.review_saved");
  });

  it("declines under review requests with a cancellation reason", async () => {
    const { quoteRequest, service } = await createService();
    await service.reviewQuoteRequest(companyUserId, quoteRequest.id, {
      action: "open_review",
    });

    const declined = await service.declineQuoteRequest(companyUserId, quoteRequest.id, {
      reasonCode: "deadline",
      reason: "Agenda indisponivel para o prazo solicitado.",
    });

    expect(declined.quoteRequest.status).toBe("declined_by_company");
    expect(declined.quoteRequest.events[0]?.metadata).toMatchObject({
      reasonCode: "deadline",
    });
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
