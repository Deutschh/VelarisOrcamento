import { AppError } from "../lib/app-error.js";

export class OperationalCompanyAccessDeniedError extends AppError {
  constructor() {
    super("Company operational access denied.", 403, "COMPANY_OPERATIONAL_ACCESS_DENIED");
  }
}

export class PriceChangeRequestNotFoundError extends AppError {
  constructor() {
    super("Price change request was not found.", 404, "PRICE_CHANGE_REQUEST_NOT_FOUND");
  }
}
