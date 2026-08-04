import { describe, expect, it } from "vitest";

import { ResendEmailAdapter } from "./email-adapter.js";

describe("ResendEmailAdapter", () => {
  it("sends email verification with a public confirmation link", async () => {
    const requests: unknown[] = [];
    const adapter = new ResendEmailAdapter({
      apiKey: "re_test",
      from: "Velaris <noreply@velarisorcamentos.com.br>",
      appPublicUrl: "https://velarisorcamentos.com.br",
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return Response.json({ id: "email-1" });
      },
    });

    await adapter.sendEmailVerification({
      to: "cliente@example.com",
      name: "Cliente",
      token: "token-123",
    });

    expect(requests[0]).toMatchObject({
      from: "Velaris <noreply@velarisorcamentos.com.br>",
      to: ["cliente@example.com"],
      subject: "Confirme seu e-mail na Velaris Orçamentos",
    });
    expect(JSON.stringify(requests[0])).toContain(
      "https://velarisorcamentos.com.br/verificar-email?token=token-123",
    );
  });

  it("throws when the provider rejects the message", async () => {
    const adapter = new ResendEmailAdapter({
      apiKey: "re_test",
      from: "Velaris <noreply@velarisorcamentos.com.br>",
      appPublicUrl: "https://velarisorcamentos.com.br",
      fetch: async () =>
        Response.json(
          { name: "validation_error", message: "Invalid from" },
          {
            status: 400,
          },
        ),
    });

    await expect(
      adapter.sendCompanyActivation({
        to: "empresa@example.com",
        companyName: "Empresa Teste",
      }),
    ).rejects.toThrow("Transactional email could not be sent.");
  });
});
