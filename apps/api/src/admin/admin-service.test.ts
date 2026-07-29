import { describe, expect, it } from "vitest";

import type { EmailAdapter } from "../notifications/email-adapter.js";
import {
  InMemoryAdminRepository,
  createTestAdminCompany,
} from "../test/in-memory-admin-repository.js";
import { AdminService } from "./admin-service.js";

function createService(repository = new InMemoryAdminRepository()) {
  let activationEmails = 0;
  const emailAdapter: EmailAdapter = {
    async sendEmailVerification() {
      return;
    },
    async sendCompanyActivation() {
      activationEmails += 1;
    },
  };

  return {
    repository,
    get activationEmails() {
      return activationEmails;
    },
    service: new AdminService({
      repository,
      emailAdapter,
    }),
  };
}

describe("AdminService", () => {
  it("activates pending companies and records audit", async () => {
    const repository = new InMemoryAdminRepository();
    repository.companies.set("company-1", createTestAdminCompany());
    const context = createService(repository);

    const company = await context.service.activateCompany("company-1", "admin-1", {
      note: "Pagamento confirmado fora da plataforma.",
    });

    expect(company.status).toBe("active");
    expect(company.subscriptionStatus).toBe("active");
    expect(company.notes[0]?.note).toContain("Pagamento confirmado");
    expect(company.auditLogs[0]?.action).toBe("company.activated");
    expect(context.activationEmails).toBe(1);
  });

  it("blocks publication for companies that are not active", async () => {
    const repository = new InMemoryAdminRepository();
    repository.companies.set("company-1", createTestAdminCompany());
    const { service } = createService(repository);

    await expect(
      service.publishCompany("company-1", "admin-1", { published: true }),
    ).rejects.toMatchObject({
      code: "COMPANY_PROFILE_REQUIRES_ACTIVE_STATUS",
    });
  });

  it("publishes active profiles", async () => {
    const repository = new InMemoryAdminRepository();
    repository.companies.set(
      "company-1",
      createTestAdminCompany({
        status: "active",
        subscriptionStatus: "active",
        activatedAt: new Date(),
      }),
    );
    const { service } = createService(repository);

    const company = await service.publishCompany("company-1", "admin-1", {
      published: true,
    });

    expect(company.profileStatus).toBe("published");
    expect(company.auditLogs[0]?.action).toBe("company.profile.published");
  });

  it("updates public profile data", async () => {
    const repository = new InMemoryAdminRepository();
    repository.companies.set("company-1", createTestAdminCompany());
    const { service } = createService(repository);

    const company = await service.updateCompanyPublicProfile("company-1", "admin-1", {
      nicheCode: "cleaning_upholstery",
      headline: "Higienizacao de sofas",
      description: "Atendimento residencial com avaliacao por fotos.",
      city: "Sao Paulo",
      state: "SP",
      postalCode: "01000-000",
      latitude: -23.55052,
      longitude: -46.633308,
      serviceRadiusKm: 25,
      serviceCities: ["Sao Paulo", "Osasco"],
      serviceNeighborhoods: [],
      gallery: [],
      services: [{ name: "Sofa", description: "Limpeza completa" }],
    });

    expect(company.publicProfile.city).toBe("Sao Paulo");
    expect(company.publicProfile.services[0]?.name).toBe("Sofa");
    expect(company.auditLogs[0]?.action).toBe("company.public_profile.updated");
  });
});
