import type { CompanyMemberRole } from "@velaris/shared";
import type { RequestHandler } from "express";

import type { AuthRepository } from "../auth/auth-repository.js";
import { CompanyAccessDeniedError } from "../auth/auth-errors.js";
import { AppError } from "../lib/app-error.js";

export function authorizeCompany(
  repository: AuthRepository,
  allowedRoles: readonly CompanyMemberRole[],
): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (!request.auth) {
        next(new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED"));
        return;
      }

      const rawCompanyId = request.params.companyId;
      const companyId = Array.isArray(rawCompanyId) ? rawCompanyId[0] : rawCompanyId;

      if (!companyId) {
        next(new AppError("Company id is required.", 400, "COMPANY_ID_REQUIRED"));
        return;
      }

      const membership = await repository.findCompanyMembership({
        userId: request.auth.userId,
        companyId,
        allowedRoles,
      });

      if (!membership || membership.companyStatus !== "active") {
        next(new CompanyAccessDeniedError());
        return;
      }

      request.companyAccess = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}
