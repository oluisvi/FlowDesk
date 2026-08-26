import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { API_VERSION_PREFIX } from '@flowdesk/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_VERSION_PREFIX);
  await app.listen(process.env.API_PORT ?? 3001);
}

void bootstrap();
