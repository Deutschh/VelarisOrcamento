import { and, eq } from "drizzle-orm";

import { companies, companyMembers, users } from "@velaris/database-schema";
import type { createDatabaseClient } from "../db/client.js";
import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "./company-account-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];

export class DrizzleCompanyAccountRepository implements CompanyAccountRepository {
  constructor(private readonly db: Database) {}

  async findCompanyAccountByUserId(
    userId: string,
  ): Promise<PersistedCompanyAccountStatus | null> {
    const [row] = await this.db
      .select({
        companyId: companies.id,
        tradingName: companies.tradingName,
        slug: companies.slug,
        status: companies.status,
        profileStatus: companies.profileStatus,
        memberRole: companyMembers.role,
        ownerEmail: users.email,
        activatedAt: companies.activatedAt,
        suspendedAt: companies.suspendedAt,
        createdAt: companies.createdAt,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .innerJoin(users, eq(users.id, companyMembers.userId))
      .where(and(eq(companyMembers.userId, userId), eq(companyMembers.status, "active")))
      .limit(1);

    return row ?? null;
  }
}
