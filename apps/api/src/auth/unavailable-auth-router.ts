import { Router } from "express";

export function createUnavailableAuthRouter() {
  const router = Router();

  router.use((_request, response) => {
    response.status(503).json({
      error: {
        code: "AUTH_NOT_CONFIGURED",
        message:
          "Authentication is not configured for this environment. Check DATABASE_URL, JWT_ACCESS_TOKEN_SECRET and runtime dependency logs.",
      },
    });
  });

  return router;
}
