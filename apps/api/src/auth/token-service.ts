import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { AuthUser } from "@velaris/shared";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AuthUser["role"];
}

export interface TokenServiceConfig {
  accessTokenSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
}

export interface IssuedRefreshToken {
  id: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export class TokenService {
  constructor(private readonly config: TokenServiceConfig) {}

  issueAccessToken(user: AuthUser): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.config.accessTokenSecret, {
      expiresIn: `${this.config.accessTokenTtlMinutes}m`,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.config.accessTokenSecret) as AccessTokenPayload;
  }

  issueRefreshToken(now = new Date()): IssuedRefreshToken {
    const token = randomBytes(48).toString("base64url");
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.config.refreshTokenTtlDays);

    return {
      id: randomUUID(),
      token,
      tokenHash: hashToken(token),
      expiresAt,
    };
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
