import { AppError } from "../lib/app-error.js";

export class CompanyAppointmentAccessDeniedError extends AppError {
  constructor() {
    super(
      "Active company access is required for appointments.",
      403,
      "COMPANY_APPOINTMENT_ACCESS_DENIED",
    );
  }
}

export class CompanyAppointmentNotFoundError extends AppError {
  constructor() {
    super(
      "Appointment not found for this company.",
      404,
      "COMPANY_APPOINTMENT_NOT_FOUND",
    );
  }
}

export class CompanyAppointmentProposalNotFoundError extends AppError {
  constructor() {
    super(
      "Proposal not found for this company.",
      404,
      "COMPANY_APPOINTMENT_PROPOSAL_NOT_FOUND",
    );
  }
}

export class CompanyAppointmentValidationError extends AppError {
  constructor(message: string, code = "COMPANY_APPOINTMENT_VALIDATION_ERROR") {
    super(message, 400, code);
  }
}

export class CompanyAppointmentLifecycleApiError extends AppError {
  constructor(message: string, code = "COMPANY_APPOINTMENT_LIFECYCLE_ERROR") {
    super(message, 409, code);
  }
}
