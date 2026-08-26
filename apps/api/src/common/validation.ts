import { BadRequestException } from "@nestjs/common";
import type { ZodType } from "zod";

export function parseBody<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Invalid request",
      fields: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}
