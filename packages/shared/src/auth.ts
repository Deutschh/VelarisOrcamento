import { z } from "zod";

export const userRoleSchema = z.enum(["customer", "company", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const companyStatusSchema = z.enum(["pending", "active", "suspended"]);
export type CompanyStatus = z.infer<typeof companyStatusSchema>;

export const companyMemberRoleSchema = z.enum(["owner", "manager", "operator"]);
export type CompanyMemberRole = z.infer<typeof companyMemberRoleSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authSessionSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export const registerCustomerRequestSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).optional(),
  password: z.string().min(8),
});

export type RegisterCustomerRequest = z.infer<typeof registerCustomerRequestSchema>;

export const registerCompanyRequestSchema = registerCustomerRequestSchema.extend({
  companyName: z.string().trim().min(2),
  companySlug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type RegisterCompanyRequest = z.infer<typeof registerCompanyRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(32).optional(),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
