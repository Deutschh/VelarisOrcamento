import { Router } from "express";
import type { Request } from "express";
import {
  companyQuoteRequestDeclineRequestSchema,
  companyQuoteRequestListQuerySchema,
  companyQuoteRequestReviewRequestSchema,
} from "@velaris/shared";

import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/app-error.js";
import type { CompanyAccountService } from "./company-account-service.js";
import type { CompanyQuoteRequestService } from "./company-quote-request-service.js";

export function createCompanyRouter(
  companyAccountService: CompanyAccountService,
  companyQuoteRequestService?: CompanyQuoteRequestService,
) {
  const router = Router();

  router.get(
    "/me",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const account = await companyAccountService.getCompanyAccount(actor.userId);
      response.json({ account });
    }),
  );

  router.get(
    "/dashboard",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyQuoteRequestService(companyQuoteRequestService);
      const result = await service.listQuoteRequests(actor.userId, {});
      response.json({ dashboard: result.dashboard });
    }),
  );

  router.get(
    "/quote-requests",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyQuoteRequestService(companyQuoteRequestService);
      const query = companyQuoteRequestListQuerySchema.parse(request.query);
      response.json(await service.listQuoteRequests(actor.userId, query));
    }),
  );

  router.get(
    "/quote-requests/:quoteRequestId",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyQuoteRequestService(companyQuoteRequestService);
      response.json(
        await service.getQuoteRequest(actor.userId, getQuoteRequestId(request.params)),
      );
    }),
  );

  router.patch(
    "/quote-requests/:quoteRequestId/review",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyQuoteRequestService(companyQuoteRequestService);
      const body = companyQuoteRequestReviewRequestSchema.parse(request.body);
      response.json(
        await service.reviewQuoteRequest(
          actor.userId,
          getQuoteRequestId(request.params),
          body,
        ),
      );
    }),
  );

  router.post(
    "/quote-requests/:quoteRequestId/decline",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyQuoteRequestService(companyQuoteRequestService);
      const body = companyQuoteRequestDeclineRequestSchema.parse(request.body);
      response.json(
        await service.declineQuoteRequest(
          actor.userId,
          getQuoteRequestId(request.params),
          body,
        ),
      );
    }),
  );

  return router;
}

function requireCompanyActor(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
  }

  if (request.auth.role !== "company") {
    throw new AppError("Company account required.", 403, "COMPANY_ROLE_REQUIRED");
  }

  return request.auth;
}

function requireCompanyQuoteRequestService(
  service: CompanyQuoteRequestService | undefined,
): CompanyQuoteRequestService {
  if (!service) {
    throw new AppError(
      "Company quote request operations are not configured for this environment.",
      503,
      "COMPANY_QUOTES_NOT_CONFIGURED",
    );
  }

  return service;
}

function getQuoteRequestId(params: Record<string, string | string[] | undefined>) {
  const rawQuoteRequestId = params.quoteRequestId;
  const quoteRequestId = Array.isArray(rawQuoteRequestId)
    ? rawQuoteRequestId[0]
    : rawQuoteRequestId;

  if (!quoteRequestId) {
    throw new AppError("Quote request id is required.", 400, "QUOTE_REQUEST_ID_REQUIRED");
  }

  return quoteRequestId;
}
