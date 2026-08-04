import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createRateLimitMiddleware } from "./rate-limit.js";

describe("rate limit middleware", () => {
  it("returns 429 after the configured limit", async () => {
    const app = express();
    let currentTime = 1_000;

    app.use(
      createRateLimitMiddleware({
        enabled: true,
        windowMs: 60_000,
        maxRequests: 2,
        now: () => currentTime,
        keyGenerator: () => "test-client",
      }),
    );
    app.get("/limited", (_request, response) => {
      response.json({ ok: true });
    });

    expect((await request(app).get("/limited")).status).toBe(200);
    expect((await request(app).get("/limited")).status).toBe(200);

    const blocked = await request(app).get("/limited");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMIT_EXCEEDED");

    currentTime += 60_001;
    expect((await request(app).get("/limited")).status).toBe(200);
  });
});
