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

export class PublicTrackingTokenInvalidError extends AppError {
  constructor() {
    super("Public tracking link is invalid or expired.", 404, "PUBLIC_TRACKING_INVALID");
  }
}

export class PublicTrackingAppointmentUnavailableError extends AppError {
  constructor() {
    super(
      "No customer appointment action is available for this request.",
      409,
      "PUBLIC_TRACKING_APPOINTMENT_UNAVAILABLE",
    );
  }
}

export class PublicRecoveryInvalidError extends AppError {
  constructor() {
    super(
      "Recovery data does not match a public request.",
      404,
      "PUBLIC_RECOVERY_INVALID",
    );
  }
}

export class PublicRecoveryEmailRequiredError extends AppError {
  constructor() {
    super(
      "This request needs an email address to receive the recovery code.",
      409,
      "PUBLIC_RECOVERY_EMAIL_REQUIRED",
    );
  }
}

export class PublicRecoveryOtpInvalidError extends AppError {
  constructor() {
    super("Recovery code is invalid.", 400, "PUBLIC_RECOVERY_OTP_INVALID");
  }
}

export class PublicRecoveryOtpExpiredError extends AppError {
  constructor() {
    super("Recovery code has expired.", 410, "PUBLIC_RECOVERY_OTP_EXPIRED");
  }
}

export class PublicRecoveryAttemptsExceededError extends AppError {
  constructor() {
    super(
      "Recovery attempt limit was reached.",
      429,
      "PUBLIC_RECOVERY_ATTEMPTS_EXCEEDED",
    );
  }
}

export class PublicProposalUnavailableError extends AppError {
  constructor() {
    super(
      "No proposal is available for this public tracking link.",
      404,
      "PUBLIC_PROPOSAL_UNAVAILABLE",
    );
  }
}

export class PublicProposalIdempotencyRequiredError extends AppError {
  constructor() {
    super(
      "Proposal action requires an Idempotency-Key header.",
      400,
      "PUBLIC_PROPOSAL_IDEMPOTENCY_REQUIRED",
    );
  }
}

export class PublicProposalIdempotencyConflictError extends AppError {
  constructor() {
    super(
      "Idempotency key was already used with a different proposal action.",
      409,
      "PUBLIC_PROPOSAL_IDEMPOTENCY_CONFLICT",
    );
  }
}

export class PublicProposalExpiredError extends AppError {
  constructor() {
    super("Expired proposals cannot be accepted.", 410, "PUBLIC_PROPOSAL_EXPIRED");
  }
}

export class PublicProposalAlreadyDecidedError extends AppError {
  constructor() {
    super(
      "This proposal has already been accepted or rejected.",
      409,
      "PUBLIC_PROPOSAL_ALREADY_DECIDED",
    );
  }
}
