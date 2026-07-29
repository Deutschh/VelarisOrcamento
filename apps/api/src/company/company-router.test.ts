import request from "supertest";
import { describe, expect, it } from "vitest";

import { TokenService } from "../auth/token-service.js";
import { createApp } from "../server.js";
import { InMemoryCompanyAccountRepository } from "../test/in-memory-company-account-repository.js";
import { CompanyAccountService } from "./company-account-service.js";

function createTestContext() {
  const repository = new InMemoryCompanyAccountRepository();
  repository.accounts.set("company-user-1", {
    companyId: "company-1",
    tradingName: "Empresa Teste",
    slug: "empresa-teste",
    status: "pending",
    profileStatus: "draft",
    memberRole: "owner",
    ownerEmail: "empresa@example.com",
    activatedAt: null,
    suspendedAt: null,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
  });
  const tokenService = new TokenService({
    accessTokenSecret: "test-access-secret",
    accessTokenTtlMinutes: 15,
    refreshTokenTtlDays: 30,
  });
  const app = createApp({
    tokenService,
    companyAccountService: new CompanyAccountService(repository),
  });

  return {
    app,
    companyToken: tokenService.issueAccessToken({
      id: "company-user-1",
      name: "Empresa Teste",
      email: "empresa@example.com",
      role: "company",
    }),
  };
}

describe("company routes", () => {
  it("returns pending account status for company users", async () => {
    const { app, companyToken } = createTestContext();

    const response = await request(app)
      .get("/api/company/me")
      .set("Authorization", `Bearer ${companyToken}`);

    expect(response.status).toBe(200);
    expect(response.body.account.status).toBe("pending");
    expect(response.body.account.memberRole).toBe("owner");
  });
});
