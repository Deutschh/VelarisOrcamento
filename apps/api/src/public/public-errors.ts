import { AppError } from "../lib/app-error.js";

export class PublicCompanyNotFoundError extends AppError {
  constructor() {
    super("Company public profile not found.", 404, "PUBLIC_COMPANY_NOT_FOUND");
  }
}

export class PublicQuoteConfigurationUnavailableError extends AppError {
  constructor() {
    super(
      "Company quote configuration is not published yet.",
      409,
      "PUBLIC_QUOTE_CONFIGURATION_UNAVAILABLE",
    );
  }
}

export class PublicQuoteDraftNotFoundError extends AppError {
  constructor() {
    super("Quote draft not found.", 404, "PUBLIC_QUOTE_DRAFT_NOT_FOUND");
  }
}

export class PublicQuoteDraftExpiredError extends AppError {
  constructor() {
    super("Quote draft has expired.", 410, "PUBLIC_QUOTE_DRAFT_EXPIRED");
  }
}

export class PublicQuoteDraftNotEditableError extends AppError {
  constructor() {
    super("Quote draft is no longer editable.", 409, "PUBLIC_QUOTE_DRAFT_NOT_EDITABLE");
  }
}

export class PublicQuoteCalculationError extends AppError {
  constructor(code: string, message: string) {
    super(message, 422, `PUBLIC_QUOTE_${code}`);
  }
}

export class PublicQuoteSubmissionValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "PUBLIC_QUOTE_SUBMISSION_VALIDATION_ERROR");
  }
}

export class PublicQuoteIdempotencyRequiredError extends AppError {
  constructor() {
    super(
      "Quote submission requires an Idempotency-Key header.",
      400,
      "PUBLIC_QUOTE_IDEMPOTENCY_REQUIRED",
    );
  }
}

export class PublicQuoteIdempotencyConflictError extends AppError {
  constructor() {
    super(
      "Idempotency key was already used with a different payload.",
      409,
      "PUBLIC_QUOTE_IDEMPOTENCY_CONFLICT",
    );
  }
}

export class PublicQuoteRequestsUnavailableError extends AppError {
  constructor() {
    super(
      "Public quote requests require DATABASE_URL in the local environment.",
      503,
      "PUBLIC_QUOTE_REQUESTS_NOT_CONFIGURED",
    );
  }
}
