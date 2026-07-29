import { z } from "zod";
import { APP_DEFAULTS } from "./constants.js";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const appEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "homologation", "production"])
    .default("development"),
  APP_NAME: z.string().default(APP_DEFAULTS.name),
  APP_LOCALE: z.string().default(APP_DEFAULTS.locale),
  APP_TIMEZONE: z.string().default(APP_DEFAULTS.timezone),
  APP_CURRENCY: z.string().default(APP_DEFAULTS.currency),
  WEB_PORT: z.coerce.number().int().positive().default(5173),
  API_PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  DATABASE_SSL_MODE: z.enum(["disable", "prefer", "require"]).default("require"),
  JWT_ACCESS_TOKEN_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_REFRESH_TOKEN_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  DRAFT_EXPIRATION_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(APP_DEFAULTS.draftExpirationDays),
  QUOTE_VALIDITY_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(APP_DEFAULTS.quoteValidityDays),
  EMAIL_PROVIDER: z.enum(["stub"]).default("stub"),
  FILE_STORAGE_PROVIDER: z.enum(["stub"]).default("stub"),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
