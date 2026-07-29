import { Router } from "express";

import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/app-error.js";
import type { CompanyAccountService } from "./company-account-service.js";

export function createCompanyRouter(companyAccountService: CompanyAccountService) {
  const router = Router();

  router.get(
    "/me",
    asyncHandler(async (request, response) => {
      if (!request.auth) {
        throw new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
      }

      if (request.auth.role !== "company") {
        throw new AppError("Company account required.", 403, "COMPANY_ROLE_REQUIRED");
      }

      const account = await companyAccountService.getCompanyAccount(request.auth.userId);
      response.json({ account });
    }),
  );

  return router;
}
