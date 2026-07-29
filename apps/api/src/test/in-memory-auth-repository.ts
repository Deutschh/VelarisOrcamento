import type {
  AuthRepository,
  CompanyMembership,
  CreateEmailVerificationTokenInput,
  CreateRefreshTokenInput,
  CreateUserInput,
  PersistedEmailVerificationToken,
  PersistedRefreshToken,
  PersistedUser,
} from "../auth/auth-repository.js";

export class InMemoryAuthRepository implements AuthRepository {
  readonly users = new Map<string, PersistedUser>();
  readonly companies = new Map<
    string,
    { id: string; slug: string; status: "pending" | "active" | "suspended" }
  >();
  readonly memberships: CompanyMembership[] = [];
  readonly refreshTokens = new Map<string, PersistedRefreshToken>();
  readonly emailVerificationTokens = new Map<string, PersistedEmailVerificationToken>();

  async findUserByEmail(email: string): Promise<PersistedUser | null> {
    const normalizedEmail = email.toLowerCase();
    return (
      Array.from(this.users.values()).find((user) => user.email === normalizedEmail) ??
      null
    );
  }

  async findUserById(id: string): Promise<PersistedUser | null> {
    return this.users.get(id) ?? null;
  }

  async findCompanyBySlug(slug: string): Promise<{ id: string } | null> {
    const company = Array.from(this.companies.values()).find(
      (candidate) => candidate.slug === slug,
    );

    return company ? { id: company.id } : null;
  }

  async createCustomerUser(input: CreateUserInput): Promise<PersistedUser> {
    const user = toPersistedUser(input);
    this.users.set(user.id, user);
    return user;
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
    const user = toPersistedUser(input.user);
    this.users.set(user.id, user);
    this.companies.set(input.company.id, {
      id: input.company.id,
      slug: input.company.slug,
      status: "pending",
    });
    this.memberships.push({
      companyId: input.company.id,
      userId: user.id,
      role: "owner",
      companyStatus: "pending",
    });

    return {
      user,
      companyId: input.company.id,
    };
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    this.refreshTokens.set(input.tokenHash, {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<PersistedRefreshToken | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  async revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void> {
    for (const [tokenHash, token] of this.refreshTokens.entries()) {
      if (token.id === id) {
        this.refreshTokens.set(tokenHash, {
          ...token,
          revokedAt: new Date(),
          id: replacedByTokenId ? token.id : token.id,
        });
      }
    }
  }

  async createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput,
  ): Promise<void> {
    this.emailVerificationTokens.set(input.tokenHash, {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    });
  }

  async findEmailVerificationTokenByHash(
    tokenHash: string,
  ): Promise<PersistedEmailVerificationToken | null> {
    return this.emailVerificationTokens.get(tokenHash) ?? null;
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    for (const [tokenHash, token] of this.emailVerificationTokens.entries()) {
      if (token.id === id) {
        this.emailVerificationTokens.set(tokenHash, {
          ...token,
          usedAt: new Date(),
        });
      }
    }
  }

  async markUserEmailVerified(_userId: string): Promise<void> {
    return;
  }

  async findCompanyMembership(input: {
    userId: string;
    companyId: string;
    allowedRoles: readonly ("owner" | "manager" | "operator")[];
  }): Promise<CompanyMembership | null> {
    return (
      this.memberships.find(
        (membership) =>
          membership.userId === input.userId &&
          membership.companyId === input.companyId &&
          input.allowedRoles.includes(membership.role),
      ) ?? null
    );
  }
}

function toPersistedUser(input: CreateUserInput): PersistedUser {
  return {
    id: input.id,
    name: input.name,
    email: input.email.toLowerCase(),
    role: input.role,
    passwordHash: input.passwordHash,
  };
}
