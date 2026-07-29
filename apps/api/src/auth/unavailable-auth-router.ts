import { Router } from "express";

export function createUnavailableAuthRouter() {
  const router = Router();

  router.use((_request, response) => {
    response.status(503).json({
      error: {
        code: "AUTH_NOT_CONFIGURED",
        message:
          "Authentication requires DATABASE_URL and JWT_ACCESS_TOKEN_SECRET in the local environment.",
      },
    });
  });

  return router;
}
