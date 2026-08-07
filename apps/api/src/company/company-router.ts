import { Router } from "express";
import type { Request } from "express";
import {
  HTTP_HEADERS,
  companyPriceChangeRequestCreateSchema,
  companyProposeAppointmentRequestSchema,
  companyCreateProposalRequestSchema,
  metricsPeriodQuerySchema,
  companyUpdateAppointmentRequestSchema,
  companyQuoteRequestDeclineRequestSchema,
  companyQuoteRequestListQuerySchema,
  companyQuoteRequestReviewRequestSchema,
} from "@velaris/shared";

import { asyncHandler } from "../lib/async-handler.js";
import { AppError } from "../lib/app-error.js";
import type { CompanyAccountService } from "./company-account-service.js";
import type { CompanyAppointmentService } from "./company-appointment-service.js";
import type { CompanyProposalService } from "./company-proposal-service.js";
import type { CompanyQuoteRequestService } from "./company-quote-request-service.js";
import type { OperationalMetricsService } from "../operational/operational-metrics-service.js";

export function createCompanyRouter(
  companyAccountService: CompanyAccountService,
  companyQuoteRequestService?: CompanyQuoteRequestService,
  companyProposalService?: CompanyProposalService,
  companyAppointmentService?: CompanyAppointmentService,
  operationalMetricsService?: OperationalMetricsService,
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
    "/metrics",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireOperationalMetricsService(operationalMetricsService);
      const query = metricsPeriodQuerySchema.parse(request.query);
      response.json(await service.getCompanyMetrics(actor.userId, query));
    }),
  );

  router.get(
    "/price-change-requests",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireOperationalMetricsService(operationalMetricsService);
      response.json(await service.listCompanyPriceChangeRequests(actor.userId));
    }),
  );

  router.post(
    "/price-change-requests",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireOperationalMetricsService(operationalMetricsService);
      const body = companyPriceChangeRequestCreateSchema.parse(request.body);
      response
        .status(201)
        .json(await service.createCompanyPriceChangeRequest(actor.userId, body));
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

  router.get(
    "/quote-requests/:quoteRequestId/files/:fileId",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyQuoteRequestService(companyQuoteRequestService);
      const file = await service.getQuoteRequestFile(
        actor.userId,
        getQuoteRequestId(request.params),
        String(request.params.fileId),
      );
      const fileName = file.fileName.replace(/[\r\n"]/g, "_");
      response
        .status(200)
        .set({
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Content-Type": file.mimeType,
        })
        .send(file.content);
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

  router.post(
    "/quote-requests/:quoteRequestId/proposals",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyProposalService(companyProposalService);
      const body = companyCreateProposalRequestSchema.parse(request.body);
      response.json(
        await service.createProposalVersion(
          actor.userId,
          getQuoteRequestId(request.params),
          body,
        ),
      );
    }),
  );

  router.post(
    "/proposals/:quoteId/appointment",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyAppointmentService(companyAppointmentService);
      const body = companyProposeAppointmentRequestSchema.parse(request.body);
      response.json(
        await service.proposeAppointment(actor.userId, getQuoteId(request.params), body),
      );
    }),
  );

  router.patch(
    "/appointments/:appointmentId",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyAppointmentService(companyAppointmentService);
      const body = companyUpdateAppointmentRequestSchema.parse(request.body);
      response.json(
        await service.updateAppointment(
          actor.userId,
          getAppointmentId(request.params),
          body,
        ),
      );
    }),
  );

  router.post(
    "/appointments/:appointmentId/complete",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyAppointmentService(companyAppointmentService);
      response.json(
        await service.completeAppointment(actor.userId, getAppointmentId(request.params)),
      );
    }),
  );

  router.post(
    "/proposals/:quoteId/send",
    asyncHandler(async (request, response) => {
      const actor = requireCompanyActor(request);
      const service = requireCompanyProposalService(companyProposalService);
      response.json(
        await service.sendProposal(
          actor.userId,
          getQuoteId(request.params),
          request.get(HTTP_HEADERS.idempotencyKey),
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

function requireCompanyProposalService(
  service: CompanyProposalService | undefined,
): CompanyProposalService {
  if (!service) {
    throw new AppError(
      "Company proposal operations are not configured for this environment.",
      503,
      "COMPANY_PROPOSALS_NOT_CONFIGURED",
    );
  }

  return service;
}

function requireCompanyAppointmentService(
  service: CompanyAppointmentService | undefined,
): CompanyAppointmentService {
  if (!service) {
    throw new AppError(
      "Company appointment operations are not configured for this environment.",
      503,
      "COMPANY_APPOINTMENTS_NOT_CONFIGURED",
    );
  }

  return service;
}

function requireOperationalMetricsService(
  service: OperationalMetricsService | undefined,
): OperationalMetricsService {
  if (!service) {
    throw new AppError(
      "Company operational metrics are not configured for this environment.",
      503,
      "COMPANY_OPERATIONAL_METRICS_NOT_CONFIGURED",
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

function getQuoteId(params: Record<string, string | string[] | undefined>) {
  const rawQuoteId = params.quoteId;
  const quoteId = Array.isArray(rawQuoteId) ? rawQuoteId[0] : rawQuoteId;

  if (!quoteId) {
    throw new AppError("Proposal id is required.", 400, "PROPOSAL_ID_REQUIRED");
  }

  return quoteId;
}

function getAppointmentId(params: Record<string, string | string[] | undefined>) {
  const rawAppointmentId = params.appointmentId;
  const appointmentId = Array.isArray(rawAppointmentId)
    ? rawAppointmentId[0]
    : rawAppointmentId;

  if (!appointmentId) {
    throw new AppError("Appointment id is required.", 400, "APPOINTMENT_ID_REQUIRED");
  }

  return appointmentId;
}
