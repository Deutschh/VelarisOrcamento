import { describe, expect, it } from "vitest";

import { InMemoryCompanyAccountRepository } from "../test/in-memory-company-account-repository.js";
import { InMemoryOperationalMetricsRepository } from "../test/in-memory-operational-metrics-repository.js";
import { OperationalMetricsService } from "./operational-metrics-service.js";

const companyId = "20000000-0000-4000-8000-000000000001";
const companyUserId = "20000000-0000-4000-8000-000000000101";
const operatorUserId = "20000000-0000-4000-8000-000000000102";
const suspendedUserId = "20000000-0000-4000-8000-000000000103";
const adminUserId = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-08-04T12:00:00.000Z");

function createService() {
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
    createdAt: now,
  });
  accountRepository.accounts.set(operatorUserId, {
    companyId,
    tradingName: "Limpa Sofa",
    slug: "limpa-sofa",
    status: "active",
    profileStatus: "published",
    memberRole: "operator",
    ownerEmail: "empresa@example.com",
    activatedAt: now,
    suspendedAt: null,
    createdAt: now,
  });
  accountRepository.accounts.set(suspendedUserId, {
    companyId,
    tradingName: "Limpa Sofa",
    slug: "limpa-sofa",
    status: "suspended",
    profileStatus: "published",
    memberRole: "owner",
    ownerEmail: "empresa@example.com",
    activatedAt: now,
    suspendedAt: now,
    createdAt: now,
  });

  const repository = new InMemoryOperationalMetricsRepository();
  const service = new OperationalMetricsService({
    accountRepository,
    repository,
    now: () => now,
  });

  return {
    repository,
    service,
  };
}

describe("OperationalMetricsService", () => {
  it("returns company metrics only for active company members", async () => {
    const { repository, service } = createService();

    await service.getCompanyMetrics(companyUserId, {});

    expect(repository.companyMetricQueries[0]).toMatchObject({ companyId });
  });

  it("blocks metrics for inactive companies", async () => {
    const { service } = createService();

    await expect(service.getCompanyMetrics(suspendedUserId, {})).rejects.toMatchObject({
      code: "COMPANY_OPERATIONAL_ACCESS_DENIED",
    });
  });

  it("allows owners to create price change requests", async () => {
    const { repository, service } = createService();

    const response = await service.createCompanyPriceChangeRequest(companyUserId, {
      title: "Revisar valor de sofa",
      description: "O custo atual de produtos subiu e precisa de revisao.",
    });

    expect(response.priceChangeRequest.status).toBe("open");
    expect(repository.createdPriceChangeRequests[0]).toMatchObject({
      companyId,
      actorUserId: companyUserId,
    });
  });

  it("blocks price change request creation for operators", async () => {
    const { service } = createService();

    await expect(
      service.createCompanyPriceChangeRequest(operatorUserId, {
        title: "Revisar valor de sofa",
        description: "O custo atual de produtos subiu e precisa de revisao.",
      }),
    ).rejects.toMatchObject({
      code: "COMPANY_OPERATIONAL_ACCESS_DENIED",
    });
  });

  it("returns not found when admin resolves an unknown price change request", async () => {
    const { service } = createService();

    await expect(
      service.resolveAdminPriceChangeRequest(
        "40000000-0000-4000-8000-000000000999",
        adminUserId,
        {
          status: "approved",
          resolutionNote: "Ajuste aprovado.",
        },
      ),
    ).rejects.toMatchObject({
      code: "PRICE_CHANGE_REQUEST_NOT_FOUND",
    });
  });
});
