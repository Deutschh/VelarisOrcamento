import { Router } from "express";
import type { Request } from "express";
import {
  adminCompanyActionRequestSchema,
  adminCompanyListQuerySchema,
  adminPublishCompanyRequestSchema,
  internalNoteRequestSchema,
} from "@velaris/shared";

import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/app-error.js";
import type { AdminService } from "./admin-service.js";

export function createAdminRouter(adminService: AdminService) {
  const router = Router();

  router.get(
    "/companies",
    asyncHandler(async (request, response) => {
      const query = adminCompanyListQuerySchema.parse(request.query);
      const companies = await adminService.listCompanies(query);
      response.json({ companies });
    }),
  );

  router.get(
    "/companies/:companyId",
    asyncHandler(async (request, response) => {
      const company = await adminService.getCompany(getCompanyId(request.params));
      response.json({ company });
    }),
  );

  router.post(
    "/companies/:companyId/activate",
    asyncHandler(async (request, response) => {
      const body = adminCompanyActionRequestSchema.parse(request.body);
      const company = await adminService.activateCompany(
        getCompanyId(request.params),
        getActorUserId(request),
        body,
      );

      response.json({ company });
    }),
  );

  router.post(
    "/companies/:companyId/suspend",
    asyncHandler(async (request, response) => {
      const body = adminCompanyActionRequestSchema.parse(request.body);
      const company = await adminService.suspendCompany(
        getCompanyId(request.params),
        getActorUserId(request),
        body,
      );

      response.json({ company });
    }),
  );

  router.post(
    "/companies/:companyId/publish",
    asyncHandler(async (request, response) => {
      const body = adminPublishCompanyRequestSchema.parse(request.body);
      const company = await adminService.publishCompany(
        getCompanyId(request.params),
        getActorUserId(request),
        body,
      );

      response.json({ company });
    }),
  );

  router.post(
    "/companies/:companyId/notes",
    asyncHandler(async (request, response) => {
      const body = internalNoteRequestSchema.parse(request.body);
      const company = await adminService.createInternalNote(
        getCompanyId(request.params),
        getActorUserId(request),
        body,
      );

      response.status(201).json({ company });
    }),
  );

  return router;
}

function getCompanyId(params: Record<string, string | string[] | undefined>) {
  const rawCompanyId = params.companyId;
  const companyId = Array.isArray(rawCompanyId) ? rawCompanyId[0] : rawCompanyId;

  if (!companyId) {
    throw new AppError("Company id is required.", 400, "COMPANY_ID_REQUIRED");
  }

  return companyId;
}

function getActorUserId(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
  }

  return request.auth.userId;
}
