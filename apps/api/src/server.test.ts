import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp, resolveCorsAllowedOrigins } from "./server.js";

describe("resolveCorsAllowedOrigins", () => {
  it("uses the single cors origin by default", () => {
    expect(
      Array.from(
        resolveCorsAllowedOrigins({
          CORS_ORIGIN: "https://app.velarisorcamentos.com.br",
          CORS_ORIGINS: undefined,
        }),
      ),
    ).toEqual(["https://app.velarisorcamentos.com.br"]);
  });

  it("allows a comma-separated cors origin list", () => {
    expect(
      Array.from(
        resolveCorsAllowedOrigins({
          CORS_ORIGIN: "https://app.velarisorcamentos.com.br",
          CORS_ORIGINS:
            "https://app.velarisorcamentos.com.br, https://velaris-orcamento.vercel.app",
        }),
      ),
    ).toEqual([
      "https://app.velarisorcamentos.com.br",
      "https://velaris-orcamento.vercel.app",
    ]);
  });
});

describe("cors middleware", () => {
  it("echoes an allowed origin", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
});
