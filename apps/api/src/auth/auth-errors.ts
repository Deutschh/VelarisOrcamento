import { AppError } from "../lib/app-error.js";

export class AuthConfigurationError extends AppError {
  constructor() {
    super(
      "Authentication is not configured for this environment.",
      503,
      "AUTH_NOT_CONFIGURED",
    );
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid e-mail or password.", 401, "INVALID_CREDENTIALS");
  }
}

export class EmailAlreadyRegisteredError extends AppError {
  constructor() {
    super("E-mail is already registered.", 409, "EMAIL_ALREADY_REGISTERED");
  }
}

export class CompanySlugAlreadyRegisteredError extends AppError {
  constructor() {
    super("Company slug is already registered.", 409, "COMPANY_SLUG_ALREADY_REGISTERED");
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super("Refresh token is invalid or expired.", 401, "INVALID_REFRESH_TOKEN");
  }
}

export class CompanyAccessDeniedError extends AppError {
  constructor() {
    super("Company access denied.", 403, "COMPANY_ACCESS_DENIED");
  }
}
