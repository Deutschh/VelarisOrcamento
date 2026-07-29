import { describe, expect, it } from "vitest";

import { InMemoryAuthRepository } from "../test/in-memory-auth-repository.js";
import type { PasswordHasher } from "./password.js";
import { AuthService } from "./auth-service.js";
import { TokenService, hashToken } from "./token-service.js";

const testPasswordHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
  async verify(hash, password) {
    return hash === `hashed:${password}`;
  },
};

function createService(repository = new InMemoryAuthRepository()) {
  return {
    repository,
    service: new AuthService({
      repository,
      passwordHasher: testPasswordHasher,
      tokenService: new TokenService({
        accessTokenSecret: "test-access-secret",
        accessTokenTtlMinutes: 15,
        refreshTokenTtlDays: 30,
      }),
    }),
  };
}

describe("AuthService", () => {
  it("registers customer users without exposing password hashes", async () => {
    const { service } = createService();

    const session = await service.registerCustomer(
      {
        name: "Cliente Teste",
        email: "CLIENTE@example.com",
        password: "senha-segura",
      },
      {},
    );

    expect(session.user.email).toBe("cliente@example.com");
    expect(session).not.toHaveProperty("passwordHash");
    expect(session.refreshToken).toHaveLength(64);
  });

  it("rejects invalid login credentials", async () => {
    const { service } = createService();

    await expect(
      service.login({ email: "missing@example.com", password: "x" }, {}),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("rotates refresh tokens", async () => {
    const { repository, service } = createService();
    const session = await service.registerCustomer(
      {
        name: "Cliente Teste",
        email: "cliente@example.com",
        password: "senha-segura",
      },
      {},
    );

    const refreshedSession = await service.refresh(session.refreshToken, {});

    expect(refreshedSession.refreshToken).not.toBe(session.refreshToken);
    expect(
      repository.refreshTokens.get(hashToken(session.refreshToken))?.revokedAt,
    ).toBeInstanceOf(Date);
  });

  it("registers company users as pending company owners", async () => {
    const { repository, service } = createService();

    const session = await service.registerCompany(
      {
        name: "Dona Empresa",
        email: "empresa@example.com",
        password: "senha-segura",
        companyName: "Empresa Teste",
        companySlug: "empresa-teste",
      },
      {},
    );

    const membership = await repository.findCompanyMembership({
      userId: session.user.id,
      companyId: session.companyId,
      allowedRoles: ["owner"],
    });

    expect(session.user.role).toBe("company");
    expect(membership?.role).toBe("owner");
    expect(membership?.companyStatus).toBe("pending");
  });
});
