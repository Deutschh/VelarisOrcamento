import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { InMemoryAuthRepository } from "../test/in-memory-auth-repository.js";
import { errorHandler } from "./error-handler.js";
import { authorizeCompany } from "./authorize-company.js";

function createProtectedApp(repository: InMemoryAuthRepository) {
  const app = express();

  app.get(
    "/companies/:companyId/protected",
    (request, _response, next) => {
      request.auth = {
        userId: "user-1",
        email: "empresa@example.com",
        role: "company",
      };
      next();
    },
    authorizeCompany(repository, ["owner"]),
    (_request, response) => {
      response.json({ ok: true });
    },
  );

  app.use(errorHandler);

  return app;
}

describe("authorizeCompany", () => {
  it("allows active memberships with a permitted role", async () => {
    const repository = new InMemoryAuthRepository();
    repository.memberships.push({
      userId: "user-1",
      companyId: "company-1",
      role: "owner",
      companyStatus: "active",
    });

    const response = await request(createProtectedApp(repository)).get(
      "/companies/company-1/protected",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("blocks pending companies", async () => {
    const repository = new InMemoryAuthRepository();
    repository.memberships.push({
      userId: "user-1",
      companyId: "company-1",
      role: "owner",
      companyStatus: "pending",
    });

    const response = await request(createProtectedApp(repository)).get(
      "/companies/company-1/protected",
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("COMPANY_ACCESS_DENIED");
  });

  it("blocks access to resources from another company", async () => {
    const repository = new InMemoryAuthRepository();
    repository.memberships.push({
      userId: "user-1",
      companyId: "company-1",
      role: "owner",
      companyStatus: "active",
    });

    const response = await request(createProtectedApp(repository)).get(
      "/companies/company-2/protected",
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("COMPANY_ACCESS_DENIED");
  });
});
