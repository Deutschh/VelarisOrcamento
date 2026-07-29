import { AppError } from "../lib/app-error.js";

export class PublicCompanyNotFoundError extends AppError {
  constructor() {
    super("Company public profile not found.", 404, "PUBLIC_COMPANY_NOT_FOUND");
  }
}
