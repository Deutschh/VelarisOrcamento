import { describe, expect, it } from "vitest";
import type { CompanyPublicProfileSettings } from "@velaris/shared";
import { createDefaultPublicProfile } from "./public-profile.js";
import { PublicCompanyService } from "./public-service.js";
import type {
  PersistedPublicCompany,
  PublicCompanyRepository,
} from "./public-repository.js";

class InMemoryPublicCompanyRepository implements PublicCompanyRepository {
  constructor(private readonly companies: PersistedPublicCompany[]) {}

  async listPublishedCompanies() {
    return this.companies;
  }

  async findPublishedCompanyBySlug(slug: string) {
    return this.companies.find((company) => company.slug === slug) ?? null;
  }
}

describe("PublicCompanyService", () => {
  it("filters companies by served city", async () => {
    const service = new PublicCompanyService(
      new InMemoryPublicCompanyRepository([
        createCompany("alpha", {
          city: "Sao Paulo",
          serviceCities: ["Sao Paulo", "Osasco"],
        }),
        createCompany("beta", {
          city: "Campinas",
          serviceCities: ["Campinas"],
        }),
      ]),
    );

    const companies = await service.listCompanies({ location: "Osasco" });

    expect(companies.map((company) => company.slug)).toEqual(["alpha"]);
  });

  it("filters companies outside service radius", async () => {
    const service = new PublicCompanyService(
      new InMemoryPublicCompanyRepository([
        createCompany("near", {
          latitude: -23.55052,
          longitude: -46.633308,
          serviceRadiusKm: 40,
        }),
        createCompany("far", {
          latitude: -22.906847,
          longitude: -43.172897,
          serviceRadiusKm: 10,
        }),
      ]),
    );

    const companies = await service.listCompanies({
      latitude: -23.68216,
      longitude: -46.87549,
    });

    expect(companies.map((company) => company.slug)).toEqual(["near"]);
  });

  it("opens published profiles by slug", async () => {
    const service = new PublicCompanyService(
      new InMemoryPublicCompanyRepository([createCompany("alpha")]),
    );

    const company = await service.getCompanyBySlug("alpha");

    expect(company.slug).toBe("alpha");
  });
});

function createCompany(
  slug: string,
  profile: Partial<CompanyPublicProfileSettings> = {},
): PersistedPublicCompany {
  return {
    id: slug,
    tradingName: `Empresa ${slug}`,
    slug,
    profile: {
      ...createDefaultPublicProfile(),
      ...profile,
    },
  };
}
