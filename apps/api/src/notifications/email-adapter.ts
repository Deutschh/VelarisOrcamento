import { logger } from "../lib/logger.js";

export interface EmailVerificationMessage {
  to: string;
  name: string;
  token: string;
}

export interface CompanyActivationMessage {
  to: string;
  companyName: string;
}

export interface EmailAdapter {
  sendEmailVerification(message: EmailVerificationMessage): Promise<void>;
  sendCompanyActivation(message: CompanyActivationMessage): Promise<void>;
}

export const stubEmailAdapter: EmailAdapter = {
  async sendEmailVerification(message) {
    logger.info(
      {
        provider: "stub",
        recipientProvided: Boolean(message.to),
        tokenGenerated: Boolean(message.token),
      },
      "Email verification message skipped because no email provider is configured.",
    );
  },

  async sendCompanyActivation(message) {
    logger.info(
      {
        provider: "stub",
        recipientProvided: Boolean(message.to),
        companyNameProvided: Boolean(message.companyName),
      },
      "Company activation email skipped because no email provider is configured.",
    );
  },
};
