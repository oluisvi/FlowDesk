import { z } from "zod";

export const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(128),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const PasswordRecoverySchema = z.object({
  email: z.string().trim().email(),
});
export const PasswordResetSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(12).max(128),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
