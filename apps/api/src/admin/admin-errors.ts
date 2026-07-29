import { AppError } from "../lib/app-error.js";

export class AdminAccessDeniedError extends AppError {
  constructor() {
    super("Admin access denied.", 403, "ADMIN_ACCESS_DENIED");
  }
}

export class CompanyNotFoundError extends AppError {
  constructor() {
    super("Company not found.", 404, "COMPANY_NOT_FOUND");
  }
}

export class CompanyLifecycleRuleError extends AppError {
  constructor(code: string, message: string) {
    super(message, 409, code);
  }
}
