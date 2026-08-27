import { z } from "zod";
export const PaginationQuerySchema = z.object({ cursor:z.string().optional(), limit:z.coerce.number().int().min(1).max(100).default(50), search:z.string().trim().max(120).optional() });
export const ApiErrorSchema = z.object({ error:z.object({ code:z.string(), message:z.string(), correlationId:z.string(), fields:z.record(z.string(),z.unknown()).optional() }) });
