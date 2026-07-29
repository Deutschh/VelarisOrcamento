import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server.js";

describe("health routes", () => {
  it("returns the API health payload", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.app).toBe("Velaris Orçamentos");
  });
});
