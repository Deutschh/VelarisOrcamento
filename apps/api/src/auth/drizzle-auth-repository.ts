import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  companies,
  companyMembers,
  companyPublicProfiles,
  customerProfiles,
  emailVerificationTokens,
  refreshTokens,
  users,
} from "@velaris/database-schema";
import type { createDatabaseClient } from "../db/client.js";
import type {
  AuthRepository,
  CompanyMembership,
  CreateEmailVerificationTokenInput,
  CreateRefreshTokenInput,
  CreateUserInput,
  PersistedEmailVerificationToken,
  PersistedRefreshToken,
  PersistedUser,
} from "./auth-repository.js";

type Database = ReturnType<typeof createDatabaseClient>["db"];

function mapUser(row: typeof users.$inferSelect): PersistedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.passwordHash,
  };
}

function mapRefreshToken(row: typeof refreshTokens.$inferSelect): PersistedRefreshToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}

function mapEmailVerificationToken(
  row: typeof emailVerificationTokens.$inferSelect,
): PersistedEmailVerificationToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
  };
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  async findUserByEmail(email: string): Promise<PersistedUser | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    return row ? mapUser(row) : null;
  }

  async findUserById(id: string): Promise<PersistedUser | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);

    return row ? mapUser(row) : null;
  }

  async findCompanyBySlug(slug: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    return row ?? null;
  }

  async createCustomerUser(input: CreateUserInput): Promise<PersistedUser> {
    const [user] = await this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          id: input.id,
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role,
          ...(input.phone ? { phone: input.phone } : {}),
        })
        .returning();

      if (!createdUser) {
        throw new Error("Failed to create user.");
      }

      await tx.insert(customerProfiles).values({
        id: randomUUID(),
        userId: createdUser.id,
      });

      return [createdUser];
    });

    return mapUser(user);
  }

  async createCompanyOwner(input: {
    user: CreateUserInput;
    company: {
      id: string;
      tradingName: string;
      slug: string;
      timezone: string;
    };
  }): Promise<{ user: PersistedUser; companyId: string }> {
    return this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          id: input.user.id,
          name: input.user.name,
          email: input.user.email,
          passwordHash: input.user.passwordHash,
          role: input.user.role,
          ...(input.user.phone ? { phone: input.user.phone } : {}),
        })
        .returning();

      if (!createdUser) {
        throw new Error("Failed to create company owner.");
      }

      const [createdCompany] = await tx
        .insert(companies)
        .values({
          id: input.company.id,
          tradingName: input.company.tradingName,
          slug: input.company.slug,
          timezone: input.company.timezone,
        })
        .returning();

      if (!createdCompany) {
        throw new Error("Failed to create company.");
      }

      await tx.insert(companyMembers).values({
        id: randomUUID(),
        companyId: createdCompany.id,
        userId: createdUser.id,
        role: "owner",
      });

      await tx.insert(companyPublicProfiles).values({
        companyId: createdCompany.id,
        nicheCode: "cleaning_upholstery",
      });

      return {
        user: mapUser(createdUser),
        companyId: createdCompany.id,
      };
    });
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    await this.db.insert(refreshTokens).values({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<PersistedRefreshToken | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    return row ? mapRefreshToken(row) : null;
  }

  async revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        ...(replacedByTokenId ? { replacedByTokenId } : {}),
      })
      .where(eq(refreshTokens.id, id));
  }

  async createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput,
  ): Promise<void> {
    await this.db.insert(emailVerificationTokens).values({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
  }

  async findEmailVerificationTokenByHash(
    tokenHash: string,
  ): Promise<PersistedEmailVerificationToken | null> {
    const [row] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    return row ? mapEmailVerificationToken(row) : null;
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await this.db
      .update(emailVerificationTokens)
      .set({
        usedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailVerificationTokens.id, id));
  }

  async markUserEmailVerified(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async findCompanyMembership(input: {
    userId: string;
    companyId: string;
    allowedRoles: readonly ("owner" | "manager" | "operator")[];
  }): Promise<CompanyMembership | null> {
    const [row] = await this.db
      .select({
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
        role: companyMembers.role,
        companyStatus: companies.status,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(
        and(
          eq(companyMembers.userId, input.userId),
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.status, "active"),
        ),
      )
      .limit(1);

    if (!row || !input.allowedRoles.includes(row.role)) {
      return null;
    }

    return row;
  }
}
