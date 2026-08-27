import { z } from "zod";
export const HealthResponseSchema = z.object({ status: z.literal("ok"), service: z.literal("api"), queue: z.enum(["ok","degraded"]).optional(), timestamp: z.string().optional() });
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
