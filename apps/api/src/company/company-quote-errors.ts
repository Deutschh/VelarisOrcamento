import { AppError } from "../lib/app-error.js";

export class CompanyQuoteAccessDeniedError extends AppError {
  constructor() {
    super(
      "Active company access is required for quote requests.",
      403,
      "COMPANY_QUOTE_ACCESS_DENIED",
    );
  }
}

export class CompanyQuoteRequestNotFoundError extends AppError {
  constructor() {
    super("Quote request not found for this company.", 404, "COMPANY_QUOTE_NOT_FOUND");
  }
}

export class CompanyQuoteTransitionError extends AppError {
  constructor(message: string) {
    super(message, 409, "COMPANY_QUOTE_TRANSITION_NOT_ALLOWED");
  }
}

export class CompanyQuoteReviewValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "COMPANY_QUOTE_REVIEW_VALIDATION_ERROR");
  }
}

export class CompanyQuoteCalculationError extends AppError {
  constructor(code: string, message: string) {
    super(message, 422, `COMPANY_QUOTE_${code}`);
  }
}
