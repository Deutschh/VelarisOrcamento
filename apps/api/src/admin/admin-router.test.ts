import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server.js";
import type { EmailAdapter } from "../notifications/email-adapter.js";
import {
  InMemoryAdminRepository,
  createTestAdminCompany,
} from "../test/in-memory-admin-repository.js";
import {
  InMemoryTemplateRepository,
  createTestNicheTemplate,
} from "../test/in-memory-template-repository.js";
import { TokenService } from "../auth/token-service.js";
import { TemplateAdminService } from "../templates/template-service.js";
import { AdminService } from "./admin-service.js";

function createTestContext() {
  const repository = new InMemoryAdminRepository();
  repository.companies.set("company-1", createTestAdminCompany());
  const tokenService = new TokenService({
    accessTokenSecret: "test-access-secret",
    accessTokenTtlMinutes: 15,
    refreshTokenTtlDays: 30,
  });
  const emailAdapter: EmailAdapter = {
    async sendEmailVerification() {
      return;
    },
    async sendCompanyActivation() {
      return;
    },
  };
  const adminService = new AdminService({ repository, emailAdapter });
  const templateRepository = new InMemoryTemplateRepository();
  const template = createTestNicheTemplate();
  templateRepository.templates.set(template.id, template);
  const templateAdminService = new TemplateAdminService(templateRepository);
  const app = createApp({ tokenService, adminService, templateAdminService });

  return {
    app,
    adminToken: tokenService.issueAccessToken({
      id: "admin-1",
      name: "Admin Teste",
      email: "admin@example.com",
      role: "admin",
    }),
    companyToken: tokenService.issueAccessToken({
      id: "company-user-1",
      name: "Empresa Teste",
      email: "empresa@example.com",
      role: "company",
    }),
    template,
  };
}

describe("admin routes", () => {
  it("lists companies for admin users", async () => {
    const { app, adminToken } = createTestContext();

    const response = await request(app)
      .get("/api/admin/companies")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.companies[0].status).toBe("pending");
  });

  it("blocks non-admin users", async () => {
    const { app, companyToken } = createTestContext();

    const response = await request(app)
      .get("/api/admin/companies")
      .set("Authorization", `Bearer ${companyToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ADMIN_ACCESS_DENIED");
  });

  it("updates company public profile for admin users", async () => {
    const { app, adminToken } = createTestContext();

    const response = await request(app)
      .patch("/api/admin/companies/company-1/profile")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nicheCode: "cleaning_upholstery",
        headline: "Higienizacao residencial",
        city: "Sao Paulo",
        state: "SP",
        serviceRadiusKm: 20,
        serviceCities: ["Sao Paulo"],
        serviceNeighborhoods: [],
        gallery: [],
        services: [{ name: "Sofa" }],
      });

    expect(response.status).toBe(200);
    expect(response.body.company.publicProfile.city).toBe("Sao Paulo");
  });

  it("lists fixed niche templates for admin users", async () => {
    const { app, adminToken } = createTestContext();

    const response = await request(app)
      .get("/api/admin/niche-templates")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.templates[0].code).toBe("cleaning_upholstery");
  });

  it("creates company configurations from templates for admin users", async () => {
    const { app, adminToken, template } = createTestContext();

    const response = await request(app)
      .post("/api/admin/company-configurations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        companyId: "20000000-0000-4000-8000-000000000001",
        templateId: template.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.configuration.status).toBe("draft");
    expect(response.body.configuration.services[0].code).toBe("upholstery_cleaning");
  });
});
