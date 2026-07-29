import { Router } from "express";

export function createUnavailablePublicRouter() {
  const router = Router();

  router.use((_request, response) => {
    response.status(503).json({
      error: {
        code: "PUBLIC_DISCOVERY_NOT_CONFIGURED",
        message: "Public discovery requires DATABASE_URL in the local environment.",
      },
    });
  });

  return router;
}
