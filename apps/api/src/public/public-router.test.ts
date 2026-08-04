import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server.js";
import { createDefaultPublicProfile } from "./public-profile.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";
import type { PublicQuoteRequestService } from "./public-quote-request-service.js";
import { PublicCompanyService } from "./public-service.js";

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

  async listVisibleReviewsByCompany() {
    return [];
  }
}

function createTestApp(publicQuoteRequestService?: PublicQuoteRequestService) {
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

  return createApp({
    publicCompanyService,
    ...(publicQuoteRequestService ? { publicQuoteRequestService } : {}),
  });
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

  it("returns public proposal PDF files inline", async () => {
    const app = createTestApp({
      async getPublicProposalPdf() {
        return {
          fileName: "ORC-RQ-0001-V1.pdf",
          contentType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\n"),
        };
      },
    } as unknown as PublicQuoteRequestService);

    const response = await request(app).get(
      "/api/public/tracking/public-token/proposal/pdf",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain(
      'filename="ORC-RQ-0001-V1.pdf"',
    );
    expect(response.body.toString("ascii")).toContain("%PDF-1.4");
  });
});
