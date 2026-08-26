import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { IdentityRepository } from "../../src/common/identity.repository";
import { InMemoryIdentityRepository } from "./in-memory-identity.repository";
import { configureApp } from "../../src/app.factory";

export interface IdentityTestApp {
  app: INestApplication;
  repository: InMemoryIdentityRepository;
}

export async function createIdentityTestApp(now = new Date("2026-08-26T12:00:00.000Z")): Promise<IdentityTestApp> {
  const repository = new InMemoryIdentityRepository();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IdentityRepository)
    .useValue(repository)
    .overrideProvider("CLOCK")
    .useValue(() => now)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, repository };
}
