import { randomUUID } from "node:crypto";
import type {
  CustomerDashboardResponse,
  CustomerFavoriteResponse,
  CustomerLinkVisitorRequestsResponse,
  CustomerRemoveFavoriteResponse,
} from "@velaris/shared";

import {
  CustomerAccessDeniedError,
  CustomerAccountNotFoundError,
  CustomerCompanyNotFoundError,
  CustomerVerifiedContactRequiredError,
} from "./customer-errors.js";
import type { CustomerAccount, CustomerRepository } from "./customer-repository.js";

export interface CustomerServiceDependencies {
  repository: CustomerRepository;
  now?: () => Date;
}

export class CustomerService {
  constructor(private readonly dependencies: CustomerServiceDependencies) {}

  async getDashboard(userId: string): Promise<CustomerDashboardResponse> {
    await this.getCustomerAccount(userId);
    return this.dependencies.repository.getDashboard(userId);
  }

  async linkVisitorRequests(
    userId: string,
  ): Promise<CustomerLinkVisitorRequestsResponse> {
    const account = await this.getCustomerAccount(userId);

    if (!account.isEmailVerified) {
      throw new CustomerVerifiedContactRequiredError();
    }

    const linkedRequestsCount = await this.dependencies.repository.linkVisitorRequests({
      userId,
      email: account.email,
      phone: null,
      now: this.now(),
    });

    return {
      linkedRequestsCount,
      dashboard: await this.dependencies.repository.getDashboard(userId),
    };
  }

  async addFavoriteCompany(
    userId: string,
    companyId: string,
  ): Promise<CustomerFavoriteResponse> {
    await this.getCustomerAccount(userId);
    const favorite = await this.dependencies.repository.addFavoriteCompany({
      id: randomUUID(),
      userId,
      companyId,
      now: this.now(),
    });

    if (!favorite) {
      throw new CustomerCompanyNotFoundError();
    }

    return {
      favorite,
      dashboard: await this.dependencies.repository.getDashboard(userId),
    };
  }

  async removeFavoriteCompany(
    userId: string,
    companyId: string,
  ): Promise<CustomerRemoveFavoriteResponse> {
    await this.getCustomerAccount(userId);
    await this.dependencies.repository.removeFavoriteCompany({
      userId,
      companyId,
    });

    return {
      dashboard: await this.dependencies.repository.getDashboard(userId),
    };
  }

  private async getCustomerAccount(userId: string): Promise<CustomerAccount> {
    const account = await this.dependencies.repository.findCustomerAccount(userId);

    if (!account) {
      throw new CustomerAccountNotFoundError();
    }

    if (account.role !== "customer") {
      throw new CustomerAccessDeniedError();
    }

    return account;
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
}
