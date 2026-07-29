import { createDatabaseClient } from "../db/client.js";
import { env } from "../config/env.js";
import { AuthConfigurationError } from "./auth-errors.js";
import { DrizzleAuthRepository } from "./drizzle-auth-repository.js";
import { argon2idPasswordHasher } from "./password.js";
import { AuthService } from "./auth-service.js";
import { TokenService } from "./token-service.js";

export function createAuthServiceFromEnv(): AuthService {
  if (!env.DATABASE_URL || !env.JWT_ACCESS_TOKEN_SECRET) {
    throw new AuthConfigurationError();
  }

  const { db } = createDatabaseClient(env.DATABASE_URL);

  return new AuthService({
    repository: new DrizzleAuthRepository(db),
    passwordHasher: argon2idPasswordHasher,
    tokenService: new TokenService({
      accessTokenSecret: env.JWT_ACCESS_TOKEN_SECRET,
      accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
      refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    }),
  });
}
