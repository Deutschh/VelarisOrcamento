import { createDatabaseClient } from "../db/client.js";
import { env } from "../config/env.js";
import { AuthConfigurationError } from "./auth-errors.js";
import type { AuthRepository } from "./auth-repository.js";
import { DrizzleAuthRepository } from "./drizzle-auth-repository.js";
import { argon2idPasswordHasher } from "./password.js";
import { AuthService } from "./auth-service.js";
import { TokenService } from "./token-service.js";
import { stubEmailAdapter } from "../notifications/email-adapter.js";
import type { EmailAdapter } from "../notifications/email-adapter.js";

export function createAuthServiceFromEnv(): AuthService {
  if (!env.DATABASE_URL || !env.JWT_ACCESS_TOKEN_SECRET) {
    throw new AuthConfigurationError();
  }

  const { db } = createDatabaseClient(env.DATABASE_URL);

  return createAuthService({
    repository: new DrizzleAuthRepository(db),
    tokenService: createTokenServiceFromEnv(),
    emailAdapter: stubEmailAdapter,
  });
}

export function createTokenServiceFromEnv(): TokenService {
  if (!env.JWT_ACCESS_TOKEN_SECRET) {
    throw new AuthConfigurationError();
  }

  return new TokenService({
    accessTokenSecret: env.JWT_ACCESS_TOKEN_SECRET,
    accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  });
}

export function createAuthService(input: {
  repository: AuthRepository;
  tokenService: TokenService;
  emailAdapter?: EmailAdapter;
}): AuthService {
  return new AuthService({
    repository: input.repository,
    passwordHasher: argon2idPasswordHasher,
    tokenService: input.tokenService,
    ...(input.emailAdapter ? { emailAdapter: input.emailAdapter } : {}),
  });
}
