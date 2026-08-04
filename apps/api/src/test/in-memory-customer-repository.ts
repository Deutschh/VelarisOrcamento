import type { CustomerCompanySummary, CustomerDashboardResponse } from "@velaris/shared";

import type {
  CustomerAccount,
  CustomerRepository,
} from "../customer/customer-repository.js";

export class InMemoryCustomerRepository implements CustomerRepository {
  readonly accounts = new Map<string, CustomerAccount>();
  readonly companies = new Map<string, CustomerCompanySummary>();
  readonly favorites = new Map<string, Set<string>>();
  linkedVisitorRequestsCount = 0;
  lastLinkVisitorRequestsInput: {
    userId: string;
    email: string;
    phone: string | null;
    now: Date;
  } | null = null;

  dashboard: CustomerDashboardResponse = {
    linkedRequestsCount: 0,
    requests: [],
    proposals: [],
    appointments: [],
    history: [],
    favorites: [],
    recentCompanies: [],
    pendingReviews: [],
    notifications: [],
  };

  async findCustomerAccount(userId: string): Promise<CustomerAccount | null> {
    return this.accounts.get(userId) ?? null;
  }

  async getDashboard(userId: string): Promise<CustomerDashboardResponse> {
    return {
      ...this.dashboard,
      favorites: this.getFavoriteCompanies(userId),
    };
  }

  async linkVisitorRequests(input: {
    userId: string;
    email: string;
    phone: string | null;
    now: Date;
  }): Promise<number> {
    this.lastLinkVisitorRequestsInput = input;
    this.dashboard = {
      ...this.dashboard,
      linkedRequestsCount:
        this.dashboard.linkedRequestsCount + this.linkedVisitorRequestsCount,
    };

    return this.linkedVisitorRequestsCount;
  }

  async addFavoriteCompany(input: {
    id: string;
    userId: string;
    companyId: string;
    now: Date;
  }): Promise<CustomerCompanySummary | null> {
    const company = this.companies.get(input.companyId);

    if (!company) {
      return null;
    }

    const companyIds = this.favorites.get(input.userId) ?? new Set<string>();
    companyIds.add(input.companyId);
    this.favorites.set(input.userId, companyIds);

    return company;
  }

  async removeFavoriteCompany(input: {
    userId: string;
    companyId: string;
  }): Promise<void> {
    this.favorites.get(input.userId)?.delete(input.companyId);
  }

  private getFavoriteCompanies(userId: string) {
    const companyIds = this.favorites.get(userId) ?? new Set<string>();

    return Array.from(companyIds)
      .map((companyId) => this.companies.get(companyId))
      .filter((company): company is CustomerCompanySummary => Boolean(company));
  }
}
