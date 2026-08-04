import type { CustomerCompanySummary, CustomerDashboardResponse } from "@velaris/shared";

export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isEmailVerified: boolean;
  role: "customer" | "company" | "admin";
}

export interface CustomerRepository {
  findCustomerAccount(userId: string): Promise<CustomerAccount | null>;
  getDashboard(userId: string): Promise<CustomerDashboardResponse>;
  linkVisitorRequests(input: {
    userId: string;
    email: string;
    phone: string | null;
    now: Date;
  }): Promise<number>;
  addFavoriteCompany(input: {
    id: string;
    userId: string;
    companyId: string;
    now: Date;
  }): Promise<CustomerCompanySummary | null>;
  removeFavoriteCompany(input: { userId: string; companyId: string }): Promise<void>;
}
