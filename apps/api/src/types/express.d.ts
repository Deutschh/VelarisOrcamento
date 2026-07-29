import type { CompanyMembership } from "../auth/auth-repository.js";
import type { AccessTokenPayload } from "../auth/token-service.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: AccessTokenPayload["sub"];
        email: AccessTokenPayload["email"];
        role: AccessTokenPayload["role"];
      };
      companyAccess?: CompanyMembership;
    }
  }
}
