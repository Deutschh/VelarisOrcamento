import { AppError } from "../lib/app-error.js";

export class TemplateNotFoundError extends AppError {
  constructor() {
    super("Niche template not found.", 404, "NICHE_TEMPLATE_NOT_FOUND");
  }
}

export class CompanyConfigurationNotFoundError extends AppError {
  constructor() {
    super("Company configuration not found.", 404, "COMPANY_CONFIGURATION_NOT_FOUND");
  }
}

export class CompanyConfigurationNotEditableError extends AppError {
  constructor() {
    super(
      "Published or archived configurations cannot be edited.",
      409,
      "CONFIGURATION_NOT_EDITABLE",
    );
  }
}

export class CompanyConfigurationTemplateMismatchError extends AppError {
  constructor() {
    super(
      "Configuration payload does not match the selected template.",
      400,
      "CONFIGURATION_TEMPLATE_MISMATCH",
    );
  }
}
