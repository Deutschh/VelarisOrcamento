import type { AppEnv } from "@velaris/shared";

export type ReadinessIssueLevel = "error" | "warning";

export interface ReadinessIssue {
  level: ReadinessIssueLevel;
  code: string;
  message: string;
}

export function validateProductionReadiness(env: AppEnv): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const isHostedEnvironment = ["homologation", "production"].includes(env.NODE_ENV);

  if (!isHostedEnvironment) {
    issues.push({
      level: "warning",
      code: "LOCAL_ENVIRONMENT",
      message:
        "NODE_ENV is not homologation or production; readiness checks are informational.",
    });
  }

  if (!env.DATABASE_URL) {
    issues.push({
      level: "error",
      code: "DATABASE_URL_REQUIRED",
      message: "DATABASE_URL must be configured outside versioned files.",
    });
  }

  if (!hasStrongSecret(env.JWT_ACCESS_TOKEN_SECRET)) {
    issues.push({
      level: "error",
      code: "JWT_ACCESS_TOKEN_SECRET_WEAK",
      message: "JWT_ACCESS_TOKEN_SECRET must be present and at least 32 characters.",
    });
  }

  if (!hasStrongSecret(env.JWT_REFRESH_TOKEN_SECRET)) {
    issues.push({
      level: "warning",
      code: "JWT_REFRESH_TOKEN_SECRET_WEAK",
      message:
        "JWT_REFRESH_TOKEN_SECRET should be configured before production refresh-token hardening.",
    });
  }

  if (isHostedEnvironment && !env.CORS_ORIGIN.startsWith("https://")) {
    issues.push({
      level: "error",
      code: "CORS_ORIGIN_HTTPS_REQUIRED",
      message: "Hosted environments must use an HTTPS CORS origin.",
    });
  }

  if (isHostedEnvironment && !env.SECURITY_HSTS_ENABLED) {
    issues.push({
      level: "warning",
      code: "HSTS_NOT_EXPLICIT",
      message: "SECURITY_HSTS_ENABLED should be explicit for homologation/production.",
    });
  }

  if (isHostedEnvironment && !env.RATE_LIMIT_ENABLED) {
    issues.push({
      level: "error",
      code: "RATE_LIMIT_DISABLED",
      message: "Rate limit must remain enabled for hosted environments.",
    });
  }

  if (env.EMAIL_PROVIDER === "stub") {
    issues.push({
      level: "warning",
      code: "EMAIL_PROVIDER_STUB",
      message:
        "Transactional e-mail is still using the stub adapter; real delivery remains pending.",
    });
  }

  if (env.FILE_STORAGE_PROVIDER === "stub") {
    issues.push({
      level: "warning",
      code: "FILE_STORAGE_PROVIDER_STUB",
      message:
        "Private binary file storage is still using the stub adapter; uploads remain metadata-only.",
    });
  }

  return issues;
}

export function hasBlockingReadinessIssues(issues: ReadinessIssue[]) {
  return issues.some((issue) => issue.level === "error");
}

function hasStrongSecret(value: string | undefined) {
  return Boolean(value && value.length >= 32);
}
