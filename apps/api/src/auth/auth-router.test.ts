import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server.js";
import { InMemoryAuthRepository } from "../test/in-memory-auth-repository.js";
import type { PasswordHasher } from "./password.js";
import { AuthService } from "./auth-service.js";
import { TokenService } from "./token-service.js";

const testPasswordHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
  async verify(hash, password) {
    return hash === `hashed:${password}`;
  },
};

function createTestApp() {
  const repository = new InMemoryAuthRepository();
  const authService = new AuthService({
    repository,
    passwordHasher: testPasswordHasher,
    tokenService: new TokenService({
      accessTokenSecret: "test-access-secret",
      accessTokenTtlMinutes: 15,
      refreshTokenTtlDays: 30,
    }),
  });

  return createApp({ authService });
}

describe("auth routes", () => {
  it("registers a customer and sets secure httpOnly cookies", async () => {
    const response = await request(createTestApp())
      .post("/api/auth/register/customer")
      .send({
        name: "Cliente Teste",
        email: "cliente@example.com",
        password: "senha-segura",
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("cliente@example.com");
    expect(String(response.headers["set-cookie"])).toContain("HttpOnly");
  });

  it("registers a pending company account", async () => {
    const response = await request(createTestApp())
      .post("/api/auth/register/company")
      .send({
        name: "Dona Empresa",
        email: "empresa@example.com",
        password: "senha-segura",
        companyName: "Empresa Teste",
        companySlug: "empresa-teste",
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("company");
    expect(response.body.companyId).toEqual(expect.any(String));
  });
});
