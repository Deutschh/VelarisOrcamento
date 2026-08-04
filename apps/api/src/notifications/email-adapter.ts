import { createHash } from "node:crypto";

import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

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

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

type Fetch = typeof fetch;

interface ResendEmailAdapterConfig {
  apiKey: string;
  from: string;
  appPublicUrl: string;
  replyTo?: string;
  fetch?: Fetch;
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

export function createEmailAdapterFromEnv(): EmailAdapter {
  if (env.EMAIL_PROVIDER === "stub") {
    return stubEmailAdapter;
  }

  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM.");
    }

    return new ResendEmailAdapter({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      appPublicUrl: env.APP_PUBLIC_URL,
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
    });
  }

  return stubEmailAdapter;
}

export class ResendEmailAdapter implements EmailAdapter {
  private readonly fetch: Fetch;

  constructor(private readonly config: ResendEmailAdapterConfig) {
    this.fetch = config.fetch ?? fetch;
  }

  async sendEmailVerification(message: EmailVerificationMessage): Promise<void> {
    const verificationUrl = publicUrl(
      this.config.appPublicUrl,
      `/verificar-email?token=${encodeURIComponent(message.token)}`,
    );

    await this.sendEmail({
      to: message.to,
      subject: "Confirme seu e-mail na Velaris Orçamentos",
      idempotencyKey: emailIdempotencyKey("email-verification", message.token),
      text: [
        `Olá, ${message.name}.`,
        "",
        "Confirme seu e-mail para concluir seu cadastro na Velaris Orçamentos:",
        verificationUrl,
        "",
        "Se você não fez esse cadastro, ignore esta mensagem.",
      ].join("\n"),
      html: layoutEmail({
        title: "Confirme seu e-mail",
        greeting: `Olá, ${message.name}.`,
        body: "Clique no botão abaixo para confirmar seu e-mail e concluir seu cadastro.",
        ctaLabel: "Confirmar e-mail",
        ctaUrl: verificationUrl,
        footer: "Se você não fez esse cadastro, ignore esta mensagem.",
      }),
    });
  }

  async sendCompanyActivation(message: CompanyActivationMessage): Promise<void> {
    const loginUrl = publicUrl(this.config.appPublicUrl, "/login");

    await this.sendEmail({
      to: message.to,
      subject: "Sua empresa foi liberada na Velaris Orçamentos",
      idempotencyKey: emailIdempotencyKey(
        "company-activation",
        `${message.to}:${message.companyName}`,
      ),
      text: [
        `A empresa ${message.companyName} foi liberada na Velaris Orçamentos.`,
        "",
        "Acesse sua conta para configurar o perfil e acompanhar solicitações:",
        loginUrl,
      ].join("\n"),
      html: layoutEmail({
        title: "Empresa liberada",
        greeting: `A empresa ${message.companyName} foi liberada.`,
        body: "Acesse sua conta para configurar o perfil público e acompanhar solicitações.",
        ctaLabel: "Entrar na Velaris",
        ctaUrl: loginUrl,
      }),
    });
  }

  async sendQuoteRequestConfirmation(
    message: QuoteRequestConfirmationMessage,
  ): Promise<void> {
    const trackingUrl = publicUrl(this.config.appPublicUrl, message.trackingPath);

    await this.sendEmail({
      to: message.to,
      subject: `Recebemos sua solicitação ${message.requestCode}`,
      idempotencyKey: emailIdempotencyKey(
        "quote-request-confirmation",
        message.requestCode,
      ),
      text: [
        `Olá, ${message.name}.`,
        "",
        `Recebemos sua solicitação para ${message.companyName}.`,
        `Código da solicitação: ${message.requestCode}`,
        "",
        "Acompanhe o andamento pelo link:",
        trackingUrl,
      ].join("\n"),
      html: layoutEmail({
        title: "Solicitação recebida",
        greeting: `Olá, ${message.name}.`,
        body: `Recebemos sua solicitação para ${message.companyName}. Código: ${message.requestCode}.`,
        ctaLabel: "Acompanhar solicitação",
        ctaUrl: trackingUrl,
      }),
    });
  }

  async sendRecoveryOtp(message: RecoveryOtpMessage): Promise<void> {
    const recoveryUrl = publicUrl(this.config.appPublicUrl, "/recuperar");
    const expiresAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(message.expiresAt));

    await this.sendEmail({
      to: message.to,
      subject: `Código de recuperação da solicitação ${message.requestCode}`,
      idempotencyKey: emailIdempotencyKey(
        "recovery-otp",
        `${message.requestCode}:${message.otp}`,
      ),
      text: [
        `Olá, ${message.name}.`,
        "",
        `Seu código de recuperação é: ${message.otp}`,
        `Ele expira em ${expiresAt}.`,
        "",
        "Use o código nesta página:",
        recoveryUrl,
      ].join("\n"),
      html: layoutEmail({
        title: "Código de recuperação",
        greeting: `Olá, ${message.name}.`,
        body: `Use o código abaixo para recuperar o acompanhamento da solicitação ${message.requestCode}. Ele expira em ${expiresAt}.`,
        code: message.otp,
        ctaLabel: "Abrir recuperação",
        ctaUrl: recoveryUrl,
      }),
    });
  }

  async sendReviewInvitation(message: ReviewInvitationMessage): Promise<void> {
    const recoveryUrl = publicUrl(this.config.appPublicUrl, message.recoveryPath);

    await this.sendEmail({
      to: message.to,
      subject: `Avalie o atendimento da ${message.companyName}`,
      idempotencyKey: emailIdempotencyKey("review-invitation", message.requestCode),
      text: [
        `Olá, ${message.name}.`,
        "",
        `A ${message.companyName} marcou o serviço da solicitação ${message.requestCode} como realizado.`,
        "Acesse o acompanhamento para deixar sua avaliação:",
        recoveryUrl,
      ].join("\n"),
      html: layoutEmail({
        title: "Como foi o atendimento?",
        greeting: `Olá, ${message.name}.`,
        body: `A ${message.companyName} marcou o serviço da solicitação ${message.requestCode} como realizado. Acesse o acompanhamento para deixar sua avaliação.`,
        ctaLabel: "Recuperar acompanhamento",
        ctaUrl: recoveryUrl,
      }),
    });
  }

  private async sendEmail(input: SendEmailInput): Promise<void> {
    const response = await this.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(this.config.replyTo ? { reply_to: this.config.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        name?: string;
      } | null;

      logger.error(
        {
          provider: "resend",
          status: response.status,
          errorName: payload?.name,
          errorMessage: payload?.message,
        },
        "Transactional email failed.",
      );
      throw new Error("Transactional email could not be sent.");
    }

    const payload = (await response.json().catch(() => null)) as { id?: string } | null;
    logger.info(
      {
        provider: "resend",
        messageId: payload?.id,
      },
      "Transactional email sent.",
    );
  }
}

function publicUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

function emailIdempotencyKey(scope: string, value: string) {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 48);
  return `${scope}:${digest}`;
}

function layoutEmail(input: {
  title: string;
  greeting: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  code?: string;
  footer?: string;
}) {
  const escapedTitle = escapeHtml(input.title);
  const escapedGreeting = escapeHtml(input.greeting);
  const escapedBody = escapeHtml(input.body);
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:28px 0"><a href="${escapeHtml(input.ctaUrl)}" style="background:#00d38a;color:#071412;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700;display:inline-block">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";
  const code = input.code
    ? `<div style="font-size:28px;letter-spacing:4px;font-weight:800;background:#eefbf6;color:#071412;border-radius:6px;padding:16px;text-align:center">${escapeHtml(input.code)}</div>`
    : "";
  const footer = input.footer
    ? `<p style="font-size:12px;color:#6b7280;margin-top:28px">${escapeHtml(input.footer)}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#071412;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#12211c">
    <main style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px">
      <p style="margin:0 0 8px;color:#0f7b59;font-size:13px;font-weight:700">Velaris Orçamentos</p>
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#071412">${escapedTitle}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 12px">${escapedGreeting}</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 20px">${escapedBody}</p>
      ${code}
      ${cta}
      ${footer}
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
