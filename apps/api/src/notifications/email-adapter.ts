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

export interface QuoteRequestConfirmationMessage {
  to: string;
  name: string;
  companyName: string;
  requestCode: string;
  trackingPath: string;
}

export interface RecoveryOtpMessage {
  to: string;
  name: string;
  requestCode: string;
  otp: string;
  expiresAt: string;
}

export interface ReviewInvitationMessage {
  to: string;
  name: string;
  companyName: string;
  requestCode: string;
  recoveryPath: string;
}

export interface EmailAdapter {
  sendEmailVerification(message: EmailVerificationMessage): Promise<void>;
  sendCompanyActivation(message: CompanyActivationMessage): Promise<void>;
  sendQuoteRequestConfirmation?(message: QuoteRequestConfirmationMessage): Promise<void>;
  sendRecoveryOtp?(message: RecoveryOtpMessage): Promise<void>;
  sendReviewInvitation?(message: ReviewInvitationMessage): Promise<void>;
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

  async sendQuoteRequestConfirmation(message) {
    logger.info(
      {
        provider: "stub",
        recipientProvided: Boolean(message.to),
        requestCode: message.requestCode,
      },
      "Quote request confirmation email skipped because no email provider is configured.",
    );
  },

  async sendRecoveryOtp(message) {
    logger.info(
      {
        provider: "stub",
        recipientProvided: Boolean(message.to),
        requestCode: message.requestCode,
        expiresAt: message.expiresAt,
        otpGenerated: Boolean(message.otp),
      },
      "Recovery OTP email skipped because no email provider is configured.",
    );
  },

  async sendReviewInvitation(message) {
    logger.info(
      {
        provider: "stub",
        recipientProvided: Boolean(message.to),
        requestCode: message.requestCode,
        recoveryPath: message.recoveryPath,
      },
      "Review invitation email skipped because no email provider is configured.",
    );
  },
};
