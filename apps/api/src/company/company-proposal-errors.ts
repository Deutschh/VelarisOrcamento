import { AppError } from "../lib/app-error.js";

export class CompanyProposalAccessDeniedError extends AppError {
  constructor() {
    super(
      "Active company access is required for proposals.",
      403,
      "COMPANY_PROPOSAL_ACCESS_DENIED",
    );
  }
}

export class CompanyProposalNotFoundError extends AppError {
  constructor() {
    super("Proposal not found for this company.", 404, "COMPANY_PROPOSAL_NOT_FOUND");
  }
}

export class CompanyProposalQuoteRequestNotReadyError extends AppError {
  constructor() {
    super(
      "Quote request must be accepted for proposal before creating a proposal.",
      409,
      "COMPANY_PROPOSAL_QUOTE_REQUEST_NOT_READY",
    );
  }
}

export class CompanyProposalAppointmentRequiredError extends AppError {
  constructor() {
    super(
      "This service requires an appointment proposal before sending the proposal.",
      409,
      "COMPANY_PROPOSAL_APPOINTMENT_REQUIRED",
    );
  }
}

export class CompanyProposalValidationError extends AppError {
  constructor(message: string, code = "COMPANY_PROPOSAL_VALIDATION_ERROR") {
    super(message, 400, code);
  }
}

export class CompanyProposalLifecycleApiError extends AppError {
  constructor(message: string, code = "COMPANY_PROPOSAL_LIFECYCLE_ERROR") {
    super(message, 409, code);
  }
}

export class CompanyProposalIdempotencyRequiredError extends AppError {
  constructor() {
    super(
      "Proposal send requires an Idempotency-Key header.",
      400,
      "COMPANY_PROPOSAL_IDEMPOTENCY_REQUIRED",
    );
  }
}

export class CompanyProposalIdempotencyConflictError extends AppError {
  constructor() {
    super(
      "Idempotency key was already used with a different proposal payload.",
      409,
      "COMPANY_PROPOSAL_IDEMPOTENCY_CONFLICT",
    );
  }
}
