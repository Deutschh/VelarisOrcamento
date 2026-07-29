import type {
  AuthUser,
  CompanyMemberRole,
  CompanyStatus,
  UserRole,
} from "@velaris/shared";

export interface PersistedUser extends AuthUser {
  passwordHash: string;
}

export interface PersistedRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CompanyMembership {
  companyId: string;
  userId: string;
  role: CompanyMemberRole;
  companyStatus: CompanyStatus;
}

export interface CreateUserInput {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
}

export interface CreateCompanyInput {
  id: string;
  tradingName: string;
  slug: string;
  timezone: string;
}

export interface CreateRefreshTokenInput {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<PersistedUser | null>;
  findUserById(id: string): Promise<PersistedUser | null>;
  findCompanyBySlug(slug: string): Promise<{ id: string } | null>;
  createCustomerUser(input: CreateUserInput): Promise<PersistedUser>;
  createCompanyOwner(input: {
    user: CreateUserInput;
    company: CreateCompanyInput;
  }): Promise<{ user: PersistedUser; companyId: string }>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<PersistedRefreshToken | null>;
  revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void>;
  findCompanyMembership(input: {
    userId: string;
    companyId: string;
    allowedRoles: readonly CompanyMemberRole[];
  }): Promise<CompanyMembership | null>;
}
