import { env } from "../config/env.js";
import {
  hasBlockingReadinessIssues,
  validateProductionReadiness,
} from "../config/production-readiness.js";
import { logger } from "../lib/logger.js";

const issues = validateProductionReadiness(env);

for (const issue of issues) {
  const payload = {
    code: issue.code,
    message: issue.message,
  };

  if (issue.level === "error") {
    logger.error(payload, "Production readiness error");
  } else {
    logger.warn(payload, "Production readiness warning");
  }
}

if (hasBlockingReadinessIssues(issues)) {
  process.exitCode = 1;
} else {
  logger.info(
    {
      warningCount: issues.filter((issue) => issue.level === "warning").length,
    },
    "Production readiness check finished without blocking errors",
  );
}
