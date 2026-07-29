import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server.js";
import { createDefaultPublicProfile } from "./public-profile.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";
import { PublicCompanyService } from "./public-service.js";

class InMemoryPublicCompanyRepository implements PublicCompanyRepository {
  constructor(private readonly companies: PersistedPublicCompany[]) {}

  async listPublishedCompanies() {
    return this.companies;
  }

  async findPublishedCompanyBySlug(slug: string) {
    return this.companies.find((company) => company.slug === slug) ?? null;
  }
}

function createTestApp() {
  const publicCompanyService = new PublicCompanyService(
    new InMemoryPublicCompanyRepository([
      {
        id: "company-1",
        tradingName: "Limpa Sofa",
        slug: "limpa-sofa",
        profile: {
          ...createDefaultPublicProfile(),
          city: "Sao Paulo",
          serviceCities: ["Sao Paulo"],
          services: [{ name: "Sofa" }],
        },
      },
    ]),
  );

  return createApp({ publicCompanyService });
}

describe("public routes", () => {
  it("lists categories", async () => {
    const response = await request(createTestApp()).get("/api/public/categories");

    expect(response.status).toBe(200);
    expect(response.body.categories[0].code).toBe("cleaning_upholstery");
  });

  it("lists published companies", async () => {
    const response = await request(createTestApp()).get(
      "/api/public/companies?location=Sao%20Paulo",
    );

    expect(response.status).toBe(200);
    expect(response.body.companies[0].slug).toBe("limpa-sofa");
  });

  it("opens profile by slug", async () => {
    const response = await request(createTestApp()).get(
      "/api/public/companies/limpa-sofa",
    );

    expect(response.status).toBe(200);
    expect(response.body.company.services[0].name).toBe("Sofa");
  });
});
