import { AppError } from "../lib/app-error.js";

export class CustomerAccessDeniedError extends AppError {
  constructor() {
    super("Customer access is required.", 403, "CUSTOMER_ACCESS_REQUIRED");
  }
}

export class CustomerAccountNotFoundError extends AppError {
  constructor() {
    super("Customer account was not found.", 404, "CUSTOMER_ACCOUNT_NOT_FOUND");
  }
}

export class CustomerCompanyNotFoundError extends AppError {
  constructor() {
    super(
      "Company was not found for this customer action.",
      404,
      "CUSTOMER_COMPANY_NOT_FOUND",
    );
  }
}

export class CustomerVerifiedContactRequiredError extends AppError {
  constructor() {
    super(
      "A verified customer e-mail is required to link visitor requests.",
      403,
      "CUSTOMER_VERIFIED_CONTACT_REQUIRED",
    );
  }
}
