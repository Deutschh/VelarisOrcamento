import { Router } from "express";
import type { Request } from "express";
import {
  adminCompanyActionRequestSchema,
  adminCompanyPublicProfileRequestSchema,
  adminCompanyListQuerySchema,
  adminCreateCompanyConfigurationRequestSchema,
  adminSimulateCompanyConfigurationRequestSchema,
  adminUpdateCompanyConfigurationRequestSchema,
  adminPublishCompanyRequestSchema,
  adminReviewModerationRequestSchema,
  internalNoteRequestSchema,
} from "@velaris/shared";

import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/app-error.js";
import type { TemplateAdminService } from "../templates/template-service.js";
import type { AdminService } from "./admin-service.js";

export function createAdminRouter(
  adminService: AdminService,
  templateAdminService?: TemplateAdminService,
) {
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
      const configurations = templateAdminService
        ? await templateAdminService.listCompanyConfigurations(company.id)
        : [];
      response.json({ company: { ...company, configurations } });
    }),
  );

  router.get(
    "/niche-templates",
    asyncHandler(async (_request, response) => {
      const templates =
        await getTemplateAdminService(templateAdminService).listTemplates();
      response.json({ templates });
    }),
  );

  router.post(
    "/company-configurations",
    asyncHandler(async (request, response) => {
      const body = adminCreateCompanyConfigurationRequestSchema.parse(request.body);
      const configuration = await getTemplateAdminService(
        templateAdminService,
      ).createCompanyConfiguration(body, getActorUserId(request));

      response.status(201).json({ configuration });
    }),
  );

  router.patch(
    "/company-configurations/:configurationId",
    asyncHandler(async (request, response) => {
      const body = adminUpdateCompanyConfigurationRequestSchema.parse(request.body);
      const configuration = await getTemplateAdminService(
        templateAdminService,
      ).updateConfiguration(
        getConfigurationId(request.params),
        body,
        getActorUserId(request),
      );

      response.json({ configuration });
    }),
  );

  router.post(
    "/company-configurations/:configurationId/simulate",
    asyncHandler(async (request, response) => {
      const body = adminSimulateCompanyConfigurationRequestSchema.parse(request.body);
      const simulation = await getTemplateAdminService(
        templateAdminService,
      ).simulateConfiguration(getConfigurationId(request.params), body);

      response.json({
        preview: simulation.preview,
        calculation: simulation.calculation,
      });
    }),
  );

  router.post(
    "/company-configurations/:configurationId/publish",
    asyncHandler(async (request, response) => {
      const configuration = await getTemplateAdminService(
        templateAdminService,
      ).publishConfiguration(getConfigurationId(request.params), getActorUserId(request));

      response.json({ configuration });
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

  router.patch(
    "/companies/:companyId/profile",
    asyncHandler(async (request, response) => {
      const body = adminCompanyPublicProfileRequestSchema.parse(request.body);
      const company = await adminService.updateCompanyPublicProfile(
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

  router.patch(
    "/reviews/:reviewId/moderation",
    asyncHandler(async (request, response) => {
      const body = adminReviewModerationRequestSchema.parse(request.body);
      const review = await adminService.moderateReview(
        getReviewId(request.params),
        getActorUserId(request),
        body,
      );

      response.json({ review });
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

function getConfigurationId(params: Record<string, string | string[] | undefined>) {
  const rawConfigurationId = params.configurationId;
  const configurationId = Array.isArray(rawConfigurationId)
    ? rawConfigurationId[0]
    : rawConfigurationId;

  if (!configurationId) {
    throw new AppError(
      "Company configuration id is required.",
      400,
      "COMPANY_CONFIGURATION_ID_REQUIRED",
    );
  }

  return configurationId;
}

function getReviewId(params: Record<string, string | string[] | undefined>) {
  const rawReviewId = params.reviewId;
  const reviewId = Array.isArray(rawReviewId) ? rawReviewId[0] : rawReviewId;

  if (!reviewId) {
    throw new AppError("Review id is required.", 400, "REVIEW_ID_REQUIRED");
  }

  return reviewId;
}

function getTemplateAdminService(templateAdminService?: TemplateAdminService) {
  if (!templateAdminService) {
    throw new AppError(
      "Template administration is not configured for this environment.",
      503,
      "TEMPLATE_ADMIN_NOT_CONFIGURED",
    );
  }

  return templateAdminService;
}
