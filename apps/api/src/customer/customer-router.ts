import { Router } from "express";
import {
  customerFavoriteCompanyRequestSchema,
  customerProfileUpdateRequestSchema,
} from "@velaris/shared";

import { asyncHandler } from "../lib/async-handler.js";
import { CustomerAccessDeniedError } from "./customer-errors.js";
import type { CustomerService } from "./customer-service.js";

export function createCustomerRouter(customerService: CustomerService) {
  const router = Router();

  router.use((request, _response, next) => {
    if (request.auth?.role !== "customer") {
      next(new CustomerAccessDeniedError());
      return;
    }

    next();
  });

  router.get(
    "/me",
    asyncHandler(async (request, response) => {
      response.json(await customerService.getDashboard(requireCustomerUserId(request)));
    }),
  );

  router.get(
    "/profile",
    asyncHandler(async (request, response) => {
      response.json(await customerService.getProfile(requireCustomerUserId(request)));
    }),
  );

  router.patch(
    "/profile",
    asyncHandler(async (request, response) => {
      const payload = customerProfileUpdateRequestSchema.parse(request.body);
      response.json(
        await customerService.updateProfile(requireCustomerUserId(request), payload),
      );
    }),
  );

  router.post(
    "/link-visitor-requests",
    asyncHandler(async (request, response) => {
      response.json(
        await customerService.linkVisitorRequests(requireCustomerUserId(request)),
      );
    }),
  );

  router.post(
    "/favorites",
    asyncHandler(async (request, response) => {
      const payload = customerFavoriteCompanyRequestSchema.parse(request.body);
      response
        .status(201)
        .json(
          await customerService.addFavoriteCompany(
            requireCustomerUserId(request),
            payload.companyId,
          ),
        );
    }),
  );

  router.delete(
    "/favorites/:companyId",
    asyncHandler(async (request, response) => {
      const payload = customerFavoriteCompanyRequestSchema.parse({
        companyId: request.params.companyId,
      });
      response.json(
        await customerService.removeFavoriteCompany(
          requireCustomerUserId(request),
          payload.companyId,
        ),
      );
    }),
  );

  return router;
}

function requireCustomerUserId(request: Express.Request) {
  if (!request.auth?.userId) {
    throw new CustomerAccessDeniedError();
  }

  return request.auth.userId;
}
