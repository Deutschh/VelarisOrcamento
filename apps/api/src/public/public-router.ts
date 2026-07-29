import { Router } from "express";
import { publicCompanySearchQuerySchema } from "@velaris/shared";
import { asyncHandler } from "../lib/async-handler.js";
import type { PublicCompanyService } from "./public-service.js";

export function createPublicRouter(publicCompanyService: PublicCompanyService) {
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

  return router;
}
