import type { RequestHandler } from "express";

import { AppError } from "../lib/app-error.js";
import { getAccessTokenFromCookies } from "../auth/auth-cookies.js";
import type { TokenService } from "../auth/token-service.js";

export function authenticate(tokenService: TokenService): RequestHandler {
  return (request, _response, next) => {
    const authorization = request.get("authorization");
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const cookieToken = getAccessTokenFromCookies(request.cookies);
    const token = bearerToken ?? cookieToken;

    if (!token) {
      next(new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED"));
      return;
    }

    try {
      const payload = tokenService.verifyAccessToken(token);
      request.auth = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      next(new AppError("Invalid access token.", 401, "INVALID_ACCESS_TOKEN"));
    }
  };
}
