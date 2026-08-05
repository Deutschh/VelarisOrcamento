import type {
  CustomerCompanySummary,
  CustomerDashboardResponse,
  CustomerProfileSummary,
} from "@velaris/shared";

import type {
  CustomerAccount,
  CustomerRepository,
} from "../customer/customer-repository.js";

export class InMemoryCustomerRepository implements CustomerRepository {
  readonly accounts = new Map<string, CustomerAccount>();
  readonly companies = new Map<string, CustomerCompanySummary>();
  readonly favorites = new Map<string, Set<string>>();
  readonly avatarUrls = new Map<string, string | null>();
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

  async getProfile(userId: string): Promise<CustomerProfileSummary | null> {
    const account = this.accounts.get(userId);

    return account
      ? {
          id: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone,
          avatarUrl: this.avatarUrls.get(userId) ?? null,
          isEmailVerified: account.isEmailVerified,
        }
      : null;
  }

  async updateProfile(input: {
    userId: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    now: Date;
  }): Promise<CustomerProfileSummary | null> {
    const account = this.accounts.get(input.userId);

    if (!account) {
      return null;
    }

    const updatedAccount = {
      ...account,
      name: input.name,
      phone: input.phone,
    };

    this.accounts.set(input.userId, updatedAccount);
    this.avatarUrls.set(input.userId, input.avatarUrl);

    return {
      id: updatedAccount.id,
      name: updatedAccount.name,
      email: updatedAccount.email,
      phone: updatedAccount.phone,
      avatarUrl: input.avatarUrl,
      isEmailVerified: updatedAccount.isEmailVerified,
    };
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
