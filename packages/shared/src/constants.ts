export const APP_DEFAULTS = {
  name: "Velaris Orçamentos",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  currency: "BRL",
  draftExpirationDays: 10,
  quoteValidityDays: 7,
} as const;

export const HTTP_HEADERS = {
  idempotencyKey: "Idempotency-Key",
} as const;
