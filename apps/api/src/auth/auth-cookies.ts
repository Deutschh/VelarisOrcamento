import type { CookieOptions, Response } from "express";

import { env } from "../config/env.js";

const accessCookieName = "velaris_access_token";
const refreshCookieName = "velaris_refresh_token";

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
  options: { persistent?: boolean } = {},
) {
  const persistent = options.persistent ?? true;
  const baseOptions = authCookieOptions();

  response.cookie(accessCookieName, tokens.accessToken, {
    ...baseOptions,
    ...(persistent ? { maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000 } : {}),
  });
  response.cookie(refreshCookieName, tokens.refreshToken, {
    ...baseOptions,
    ...(persistent ? { maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000 } : {}),
  });
}

export function clearAuthCookies(response: Response) {
  const options = authCookieOptions();
  response.clearCookie(accessCookieName, options);
  response.clearCookie(refreshCookieName, options);
}

export function getRefreshTokenFromCookies(cookies: Record<string, unknown>) {
  const value = cookies[refreshCookieName];
  return typeof value === "string" ? value : undefined;
}

export function getAccessTokenFromCookies(cookies: Record<string, unknown>) {
  const value = cookies[accessCookieName];
  return typeof value === "string" ? value : undefined;
}

function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: ["homologation", "production"].includes(env.NODE_ENV),
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
  };
}
