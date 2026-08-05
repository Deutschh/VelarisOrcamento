import { describe, expect, it } from "vitest";

import { InMemoryCustomerRepository } from "../test/in-memory-customer-repository.js";
import { CustomerService } from "./customer-service.js";

const customerAccount = {
  id: "user-customer",
  name: "Cliente Teste",
  email: "cliente@example.com",
  phone: "11999999999",
  isEmailVerified: true,
  role: "customer" as const,
};

const companyAccount = {
  id: "user-company",
  name: "Empresa Teste",
  email: "empresa@example.com",
  phone: null,
  isEmailVerified: true,
  role: "company" as const,
};

const favoriteCompany = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  tradingName: "Velaris Clean",
  slug: "velaris-clean",
  nicheCode: "cleaning_upholstery" as const,
  nicheLabel: "Limpeza de estofados",
  city: "Sao Paulo",
  state: "SP",
  logoUrl: null,
  reviewSummary: {
    average: null,
    count: 0,
  },
};

function createService() {
  const repository = new InMemoryCustomerRepository();
  repository.accounts.set(customerAccount.id, customerAccount);
  repository.accounts.set(companyAccount.id, companyAccount);
  repository.companies.set(favoriteCompany.id, favoriteCompany);

  return {
    repository,
    service: new CustomerService({
      repository,
      now: () => new Date("2026-08-04T12:00:00.000Z"),
    }),
  };
}

describe("CustomerService", () => {
  it("returns the authenticated customer dashboard", async () => {
    const { service } = createService();

    const dashboard = await service.getDashboard(customerAccount.id);

    expect(dashboard.requests).toEqual([]);
    expect(dashboard.favorites).toEqual([]);
  });

  it("rejects non-customer users", async () => {
    const { service } = createService();

    await expect(service.getDashboard(companyAccount.id)).rejects.toMatchObject({
      code: "CUSTOMER_ACCESS_REQUIRED",
    });
  });

  it("returns and updates the authenticated customer profile", async () => {
    const { service } = createService();

    const current = await service.getProfile(customerAccount.id);
    expect(current.profile).toMatchObject({
      email: customerAccount.email,
      name: customerAccount.name,
      phone: customerAccount.phone,
      avatarUrl: null,
    });

    const updated = await service.updateProfile(customerAccount.id, {
      name: "Cliente Atualizado",
      phone: "(11) 98888-7777",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    expect(updated.profile).toMatchObject({
      email: customerAccount.email,
      name: "Cliente Atualizado",
      phone: "(11) 98888-7777",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    const reloaded = await service.getProfile(customerAccount.id);
    expect(reloaded.profile.name).toBe("Cliente Atualizado");
  });

  it("links visitor requests using the verified account e-mail", async () => {
    const { repository, service } = createService();
    repository.linkedVisitorRequestsCount = 2;

    const response = await service.linkVisitorRequests(customerAccount.id);

    expect(response.linkedRequestsCount).toBe(2);
    expect(repository.lastLinkVisitorRequestsInput).toMatchObject({
      userId: customerAccount.id,
      email: customerAccount.email,
      phone: null,
    });
    expect(response.dashboard.linkedRequestsCount).toBe(2);
  });

  it("rejects visitor request linking when the customer e-mail is not verified", async () => {
    const { repository, service } = createService();
    repository.accounts.set(customerAccount.id, {
      ...customerAccount,
      isEmailVerified: false,
    });

    await expect(service.linkVisitorRequests(customerAccount.id)).rejects.toMatchObject({
      code: "CUSTOMER_VERIFIED_CONTACT_REQUIRED",
    });
  });

  it("adds and removes favorite companies", async () => {
    const { service } = createService();

    const added = await service.addFavoriteCompany(
      customerAccount.id,
      favoriteCompany.id,
    );

    expect(added.favorite.id).toBe(favoriteCompany.id);
    expect(added.dashboard.favorites).toHaveLength(1);

    const removed = await service.removeFavoriteCompany(
      customerAccount.id,
      favoriteCompany.id,
    );

    expect(removed.dashboard.favorites).toEqual([]);
  });

  it("rejects favorite creation for unknown companies", async () => {
    const { service } = createService();

    await expect(
      service.addFavoriteCompany(
        customerAccount.id,
        "550e8400-e29b-41d4-a716-446655440099",
      ),
    ).rejects.toMatchObject({ code: "CUSTOMER_COMPANY_NOT_FOUND" });
  });
});
