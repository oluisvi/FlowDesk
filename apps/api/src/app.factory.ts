import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { API_VERSION_PREFIX } from "@flowdesk/config";
import { AppModule } from "./app.module";

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_VERSION_PREFIX);
  return app;
}
