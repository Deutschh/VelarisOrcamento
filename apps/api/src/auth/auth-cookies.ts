import type { Response } from "express";

import { env } from "../config/env.js";

const accessCookieName = "velaris_access_token";
const refreshCookieName = "velaris_refresh_token";

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  const secure = ["homologation", "production"].includes(env.NODE_ENV);
  const sameSite = env.COOKIE_SAMESITE;

  response.cookie(accessCookieName, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });
  response.cookie(refreshCookieName, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(accessCookieName);
  response.clearCookie(refreshCookieName);
}

export function getRefreshTokenFromCookies(cookies: Record<string, unknown>) {
  const value = cookies[refreshCookieName];
  return typeof value === "string" ? value : undefined;
}

export function getAccessTokenFromCookies(cookies: Record<string, unknown>) {
  const value = cookies[accessCookieName];
  return typeof value === "string" ? value : undefined;
}
