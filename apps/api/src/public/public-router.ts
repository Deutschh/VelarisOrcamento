import express, { Router, type Request, type Response } from "express";
import {
  HTTP_HEADERS,
  createQuoteDraftRequestSchema,
  customerAppointmentActionRequestSchema,
  publicCompanySearchQuerySchema,
  publicProposalAcceptRequestSchema,
  publicProposalRejectRequestSchema,
  publicReviewCreateRequestSchema,
  publicTrackingRecoveryRequestSchema,
  publicTrackingRecoveryVerifyRequestSchema,
  quoteDraftFileMetadataRequestSchema,
  submitQuoteDraftRequestSchema,
  updateQuoteDraftRequestSchema,
} from "@velaris/shared";
import { asyncHandler } from "../lib/async-handler.js";
import {
  PublicQuoteRequestsUnavailableError,
  PublicQuoteSubmissionValidationError,
} from "./public-errors.js";
import type { PublicCompanyService } from "./public-service.js";
import type { PublicQuoteRequestService } from "./public-quote-request-service.js";

export function createPublicRouter(
  publicCompanyService: PublicCompanyService,
  publicQuoteRequestService?: PublicQuoteRequestService,
) {
  const router = Router();

  router.get(
    "/categories",
    asyncHandler(async (_request, response) => {
      response.json({ categories: publicCompanyService.listCategories() });
    }),
  );

  router.get(
    "/companies",
    asyncHandler(async (request, response) => {
      const query = publicCompanySearchQuerySchema.parse(request.query);
      const companies = await publicCompanyService.listCompanies(query);
      response.json({ companies });
    }),
  );

  router.get(
    "/companies/:slug",
    asyncHandler(async (request, response) => {
      const company = await publicCompanyService.getCompanyBySlug(
        String(request.params.slug),
      );
      response.json({ company });
    }),
  );

  router.get(
    "/companies/:slug/services",
    asyncHandler(async (request, response) => {
      const services = await publicCompanyService.listCompanyServices(
        String(request.params.slug),
      );
      response.json({ services });
    }),
  );

  router.get(
    "/tracking/:token",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      response.json(await service.getTracking(String(request.params.token)));
    }),
  );

  router.get(
    "/tracking/:token/proposal",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const result = await service.getPublicProposal(String(request.params.token));

      response.json(result);
    }),
  );

  router.get(
    "/tracking/:token/files/:fileId",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      sendStoredFile(
        response,
        await service.getTrackingFile(
          String(request.params.token),
          String(request.params.fileId),
        ),
      );
    }),
  );

  router.get(
    "/tracking/:token/proposal/pdf",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const pdf = await service.getPublicProposalPdf(String(request.params.token));

      response
        .status(200)
        .set({
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="${pdf.fileName}"`,
          "Content-Type": pdf.contentType,
        })
        .send(pdf.buffer);
    }),
  );

  router.post(
    "/tracking/:token/proposal/accept",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const result = await service.acceptPublicProposal(
        String(request.params.token),
        publicProposalAcceptRequestSchema.parse(request.body),
        getRequestMetadata(request),
      );

      response.json(result);
    }),
  );

  router.post(
    "/tracking/:token/proposal/reject",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const result = await service.rejectPublicProposal(
        String(request.params.token),
        publicProposalRejectRequestSchema.parse(request.body),
        getRequestMetadata(request),
      );

      response.json(result);
    }),
  );

  router.post(
    "/tracking/:token/appointment",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const payload = customerAppointmentActionRequestSchema.parse(request.body);
      response.json(
        await service.recordPublicAppointmentAction(
          String(request.params.token),
          payload,
        ),
      );
    }),
  );

  router.post(
    "/recovery/request",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const payload = publicTrackingRecoveryRequestSchema.parse(request.body);
      const userAgent = request.get("user-agent");
      response.status(201).json(
        await service.requestRecovery(payload, {
          ...(request.ip ? { ipAddress: request.ip } : {}),
          ...(userAgent ? { userAgent } : {}),
        }),
      );
    }),
  );

  router.post(
    "/recovery/verify",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const payload = publicTrackingRecoveryVerifyRequestSchema.parse(request.body);
      response.json(await service.verifyRecovery(payload));
    }),
  );

  router.post(
    "/reviews",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const headerIdempotencyKey = request.get(HTTP_HEADERS.idempotencyKey);
      const payload = publicReviewCreateRequestSchema.parse({
        ...request.body,
        ...(headerIdempotencyKey ? { idempotencyKey: headerIdempotencyKey } : {}),
      });

      response
        .status(201)
        .json(await service.createPublicReview(payload, getRequestMetadata(request)));
    }),
  );

  router.post(
    "/quote-requests/drafts",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const payload = createQuoteDraftRequestSchema.parse(request.body);
      response.status(201).json(await service.createDraft(payload));
    }),
  );

  router.get(
    "/quote-requests/drafts/:draftToken",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      response.json(await service.getDraft(String(request.params.draftToken)));
    }),
  );

  router.patch(
    "/quote-requests/drafts/:draftToken",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const payload = updateQuoteDraftRequestSchema.parse(request.body);
      response.json(
        await service.updateDraft(String(request.params.draftToken), payload),
      );
    }),
  );

  router.post(
    "/quote-requests/drafts/:draftToken/files",
    express.raw({ type: () => true, limit: "15mb" }),
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        throw new PublicQuoteSubmissionValidationError("File content is required.");
      }
      const payload = quoteDraftFileMetadataRequestSchema.parse({
        itemId: request.query.itemId,
        fieldCode: request.query.fieldCode,
        fileName: request.query.fileName,
        mimeType: request.get("content-type")?.split(";")[0],
        sizeBytes: request.body.length,
      });
      response
        .status(201)
        .json(
          await service.addDraftFile(
            String(request.params.draftToken),
            payload,
            request.body,
          ),
        );
    }),
  );

  router.get(
    "/quote-requests/drafts/:draftToken/files/:fileId",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      sendStoredFile(
        response,
        await service.getDraftFile(
          String(request.params.draftToken),
          String(request.params.fileId),
        ),
      );
    }),
  );

  router.delete(
    "/quote-requests/drafts/:draftToken/files/:fileId",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      response.json(
        await service.deleteDraftFile(
          String(request.params.draftToken),
          String(request.params.fileId),
        ),
      );
    }),
  );

  router.post(
    "/quote-requests/drafts/:draftToken/estimate",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      response.json(await service.estimateDraft(String(request.params.draftToken)));
    }),
  );

  router.post(
    "/quote-requests/drafts/:draftToken/submit",
    asyncHandler(async (request, response) => {
      const service = requireQuoteRequestService(publicQuoteRequestService);
      const headerIdempotencyKey = request.get(HTTP_HEADERS.idempotencyKey);
      const userAgent = request.get("user-agent");
      const payload = submitQuoteDraftRequestSchema.parse({
        ...request.body,
        ...(headerIdempotencyKey ? { idempotencyKey: headerIdempotencyKey } : {}),
      });
      response.json(
        await service.submitDraft(String(request.params.draftToken), payload, {
          ...(headerIdempotencyKey ? { idempotencyKey: headerIdempotencyKey } : {}),
          ...(request.ip ? { ipAddress: request.ip } : {}),
          ...(userAgent ? { userAgent } : {}),
        }),
      );
    }),
  );

  return router;
}

function getRequestMetadata(request: Request) {
  const idempotencyKey = request.get(HTTP_HEADERS.idempotencyKey);
  const userAgent = request.get("user-agent");

  return {
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

function requireQuoteRequestService(
  service: PublicQuoteRequestService | undefined,
): PublicQuoteRequestService {
  if (!service) {
    throw new PublicQuoteRequestsUnavailableError();
  }

  return service;
}

function sendStoredFile(
  response: Response,
  file: { fileName: string; mimeType: string; content: Buffer },
) {
  const fileName = file.fileName.replace(/[\r\n"]/g, "_");
  response
    .status(200)
    .set({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Type": file.mimeType,
    })
    .send(file.content);
}
