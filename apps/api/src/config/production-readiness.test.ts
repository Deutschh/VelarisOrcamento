import { describe, expect, it } from "vitest";

import type { AppEnv } from "@velaris/shared";
import {
  hasBlockingReadinessIssues,
  validateProductionReadiness,
} from "./production-readiness.js";

const baseEnv: AppEnv = {
  NODE_ENV: "production",
  APP_NAME: "Velaris Orcamentos",
  APP_LOCALE: "pt-BR",
  APP_TIMEZONE: "America/Sao_Paulo",
  APP_CURRENCY: "BRL",
  APP_PUBLIC_URL: "https://velaris.example",
  WEB_PORT: 5173,
  API_PORT: 3333,
  CORS_ORIGIN: "https://app.velaris.example",
  CORS_ORIGINS: undefined,
  TRUST_PROXY: true,
  SECURITY_HSTS_ENABLED: true,
  RATE_LIMIT_ENABLED: true,
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 300,
  AUTH_RATE_LIMIT_WINDOW_MS: 900000,
  AUTH_RATE_LIMIT_MAX_REQUESTS: 30,
  DATABASE_URL: "postgres://user:password@localhost:5432/velaris",
  DATABASE_SSL_MODE: "require",
  JWT_ACCESS_TOKEN_SECRET: "access-secret-with-more-than-32-characters",
  JWT_REFRESH_TOKEN_SECRET: "refresh-secret-with-more-than-32-characters",
  COOKIE_DOMAIN: undefined,
  COOKIE_SAMESITE: "lax",
  ACCESS_TOKEN_TTL_MINUTES: 15,
  REFRESH_TOKEN_TTL_DAYS: 30,
  DRAFT_EXPIRATION_DAYS: 10,
  QUOTE_VALIDITY_DAYS: 7,
  PUBLIC_RECOVERY_OTP_TTL_MINUTES: 10,
  PUBLIC_RECOVERY_MAX_ATTEMPTS: 5,
  EMAIL_PROVIDER: "stub",
  EMAIL_FROM: undefined,
  EMAIL_REPLY_TO: undefined,
  RESEND_API_KEY: undefined,
  FILE_STORAGE_PROVIDER: "stub",
};

describe("validateProductionReadiness", () => {
  it("returns blocking issues for missing database and weak access token secret", () => {
    const issues = validateProductionReadiness({
      ...baseEnv,
      DATABASE_URL: undefined,
      JWT_ACCESS_TOKEN_SECRET: "short",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_URL_REQUIRED", level: "error" }),
        expect.objectContaining({
          code: "JWT_ACCESS_TOKEN_SECRET_WEAK",
          level: "error",
        }),
      ]),
    );
    expect(hasBlockingReadinessIssues(issues)).toBe(true);
  });

  it("keeps hosted production checks non-blocking when required security settings exist", () => {
    const issues = validateProductionReadiness(baseEnv);

    expect(issues.some((issue) => issue.level === "error")).toBe(false);
    expect(hasBlockingReadinessIssues(issues)).toBe(false);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "EMAIL_PROVIDER_STUB", level: "warning" }),
        expect.objectContaining({
          code: "FILE_STORAGE_PROVIDER_STUB",
          level: "warning",
        }),
      ]),
    );
  });

  it("blocks hosted environments without https cors origin or rate limiting", () => {
    const issues = validateProductionReadiness({
      ...baseEnv,
      CORS_ORIGIN: "http://localhost:5173",
      RATE_LIMIT_ENABLED: false,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CORS_ORIGIN_HTTPS_REQUIRED",
          level: "error",
        }),
        expect.objectContaining({ code: "RATE_LIMIT_DISABLED", level: "error" }),
      ]),
    );
  });

  it("accepts a list of https cors origins for hosted environments", () => {
    const issues = validateProductionReadiness({
      ...baseEnv,
      CORS_ORIGIN: "http://localhost:5173",
      CORS_ORIGINS:
        "https://app.velarisorcamentos.com.br, https://velaris-orcamento.vercel.app",
    });

    expect(issues.some((issue) => issue.code === "CORS_ORIGIN_HTTPS_REQUIRED")).toBe(
      false,
    );
  });

  it("requires resend credentials when resend is selected", () => {
    const issues = validateProductionReadiness({
      ...baseEnv,
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: undefined,
      RESEND_API_KEY: undefined,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RESEND_API_KEY_REQUIRED", level: "error" }),
        expect.objectContaining({ code: "EMAIL_FROM_REQUIRED", level: "error" }),
      ]),
    );
  });
});
