export const APP_DEFAULTS = {
  name: "Velaris Orçamentos",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  currency: "BRL",
  draftExpirationDays: 10,
  quoteValidityDays: 7,
  publicRecoveryOtpTtlMinutes: 10,
  publicRecoveryMaxAttempts: 5,
  legalVersions: {
    termsOfUse: "terms_v1",
    privacyPolicy: "privacy_v1",
    estimateDisclaimer: "estimate_disclaimer_v1",
    companyTerms: "company_terms_v1",
  },
} as const;

export const HTTP_HEADERS = {
  idempotencyKey: "Idempotency-Key",
} as const;
