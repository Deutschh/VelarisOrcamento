import { randomUUID } from "node:crypto";
import type {
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterCompanyRequest,
  RegisterCustomerRequest,
  VerifyEmailRequest,
} from "@velaris/shared";
import { APP_DEFAULTS } from "@velaris/shared";

import {
  CompanySlugAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
  InvalidEmailVerificationTokenError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from "./auth-errors.js";
import type {
  AuthRepository,
  CreateEmailVerificationTokenInput,
  CreateRefreshTokenInput,
} from "./auth-repository.js";
import type { EmailAdapter } from "../notifications/email-adapter.js";
import type { PasswordHasher } from "./password.js";
import { hashToken } from "./token-service.js";
import type { TokenService } from "./token-service.js";

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthServiceDependencies {
  repository: AuthRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  emailAdapter?: EmailAdapter;
}

export class AuthService {
  constructor(private readonly dependencies: AuthServiceDependencies) {}

  async registerCustomer(
    input: RegisterCustomerRequest,
    context: RequestContext,
  ): Promise<AuthSession> {
    await this.assertEmailAvailable(input.email);

    const passwordHash = await this.dependencies.passwordHasher.hash(input.password);
    const user = await this.dependencies.repository.createCustomerUser({
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: "customer",
      ...(input.phone ? { phone: input.phone } : {}),
    });

    await this.sendEmailVerification(user);

    return this.issueSession(user, context);
  }

  async registerCompany(
    input: RegisterCompanyRequest,
    context: RequestContext,
  ): Promise<AuthSession & { companyId: string }> {
    await this.assertEmailAvailable(input.email);

    const existingSlug = await this.dependencies.repository.findCompanyBySlug(
      input.companySlug,
    );

    if (existingSlug) {
      throw new CompanySlugAlreadyRegisteredError();
    }

    const passwordHash = await this.dependencies.passwordHasher.hash(input.password);
    const result = await this.dependencies.repository.createCompanyOwner({
      user: {
        id: randomUUID(),
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: "company",
        ...(input.phone ? { phone: input.phone } : {}),
      },
      company: {
        id: randomUUID(),
        tradingName: input.companyName,
        slug: input.companySlug,
        timezone: APP_DEFAULTS.timezone,
      },
    });

    await this.sendEmailVerification(result.user);

    return {
      ...(await this.issueSession(result.user, context)),
      companyId: result.companyId,
    };
  }

  async login(input: LoginRequest, context: RequestContext): Promise<AuthSession> {
    const user = await this.dependencies.repository.findUserByEmail(input.email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isValidPassword = await this.dependencies.passwordHasher.verify(
      user.passwordHash,
      input.password,
    );

    if (!isValidPassword) {
      throw new InvalidCredentialsError();
    }

    return this.issueSession(user, context);
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<AuthSession> {
    const tokenHash = hashToken(refreshToken);
    const persistedToken =
      await this.dependencies.repository.findRefreshTokenByHash(tokenHash);

    if (
      !persistedToken ||
      persistedToken.revokedAt ||
      persistedToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.dependencies.repository.findUserById(persistedToken.userId);

    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const issuedRefreshToken = this.dependencies.tokenService.issueRefreshToken();
    await this.dependencies.repository.revokeRefreshToken(
      persistedToken.id,
      issuedRefreshToken.id,
    );
    await this.persistRefreshToken(user.id, issuedRefreshToken, context);

    return {
      user: this.toAuthUser(user),
      accessToken: this.dependencies.tokenService.issueAccessToken(this.toAuthUser(user)),
      refreshToken: issuedRefreshToken.token,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const persistedToken = await this.dependencies.repository.findRefreshTokenByHash(
      hashToken(refreshToken),
    );

    if (persistedToken && !persistedToken.revokedAt) {
      await this.dependencies.repository.revokeRefreshToken(persistedToken.id);
    }
  }

  async verifyEmail(input: VerifyEmailRequest): Promise<void> {
    const persistedToken =
      await this.dependencies.repository.findEmailVerificationTokenByHash(
        hashToken(input.token),
      );

    if (
      !persistedToken ||
      persistedToken.usedAt ||
      persistedToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidEmailVerificationTokenError();
    }

    await this.dependencies.repository.markUserEmailVerified(persistedToken.userId);
    await this.dependencies.repository.markEmailVerificationTokenUsed(persistedToken.id);
  }

  private async assertEmailAvailable(email: string) {
    const existingUser = await this.dependencies.repository.findUserByEmail(email);

    if (existingUser) {
      throw new EmailAlreadyRegisteredError();
    }
  }

  private async issueSession(
    user: AuthUser & { passwordHash: string },
    context: RequestContext,
  ): Promise<AuthSession> {
    const authUser = this.toAuthUser(user);
    const issuedRefreshToken = this.dependencies.tokenService.issueRefreshToken();

    await this.persistRefreshToken(user.id, issuedRefreshToken, context);

    return {
      user: authUser,
      accessToken: this.dependencies.tokenService.issueAccessToken(authUser),
      refreshToken: issuedRefreshToken.token,
    };
  }

  private async persistRefreshToken(
    userId: string,
    issuedRefreshToken: {
      id: string;
      tokenHash: string;
      expiresAt: Date;
    },
    context: RequestContext,
  ) {
    const input: CreateRefreshTokenInput = {
      id: issuedRefreshToken.id,
      userId,
      tokenHash: issuedRefreshToken.tokenHash,
      expiresAt: issuedRefreshToken.expiresAt,
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
    };

    await this.dependencies.repository.createRefreshToken(input);
  }

  private async sendEmailVerification(user: AuthUser & { passwordHash: string }) {
    const issuedToken = this.dependencies.tokenService.issueEmailVerificationToken();
    const input: CreateEmailVerificationTokenInput = {
      id: issuedToken.id,
      userId: user.id,
      tokenHash: issuedToken.tokenHash,
      expiresAt: issuedToken.expiresAt,
    };

    await this.dependencies.repository.createEmailVerificationToken(input);
    await this.dependencies.emailAdapter?.sendEmailVerification({
      to: user.email,
      name: user.name,
      token: issuedToken.token,
    });
  }

  private toAuthUser(user: AuthUser & { passwordHash: string }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
