import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { API_VERSION_PREFIX } from "@flowdesk/config";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function configureApp(app: INestApplication): void {
  if (process.env.NODE_ENV === "production") {
    const expressApp = app.getHttpAdapter().getInstance() as {
      set(setting: string, value: number): void;
    };
    expressApp.set("trust proxy", 1);
  }
  app.setGlobalPrefix(API_VERSION_PREFIX);
  app.use(cookieParser());
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-Id"],
    exposedHeaders: ["X-Correlation-Id"],
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const incoming = request.header("x-correlation-id");
    const correlationId =
      incoming && /^[a-zA-Z0-9._-]{8,100}$/.test(incoming)
        ? incoming
        : randomUUID();
    request.headers["x-correlation-id"] = correlationId;
    response.setHeader("X-Correlation-Id", correlationId);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("X-Frame-Options", "DENY");
    next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  return app;
}
