import { randomUUID } from "node:crypto";
import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const objectPayload =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : undefined;
    const safeMessage =
      status === 401
        ? "Authentication failed"
        : status >= 500
          ? "Internal server error"
          : typeof objectPayload?.message === "string"
            ? objectPayload.message
            : typeof payload === "string"
              ? payload
              : "Request failed";
    response.status(status).json({
      error: {
        code:
          typeof objectPayload?.code === "string"
            ? objectPayload.code
            : `HTTP_${status}`,
        message: safeMessage,
        ...(objectPayload?.fields ? { fields: objectPayload.fields } : {}),
        correlationId: request.headers["x-correlation-id"] ?? randomUUID(),
      },
    });
  }
}
