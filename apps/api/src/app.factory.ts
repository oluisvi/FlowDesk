import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { API_VERSION_PREFIX } from "@flowdesk/config";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_VERSION_PREFIX);
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  return app;
}
