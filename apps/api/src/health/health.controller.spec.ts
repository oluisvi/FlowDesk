import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.factory";

describe("GET /api/v1/health", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("returns the shared healthy response", async () => {
    app = await createApp();
    await app.init();

    const response = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);

    expect(response.body).toEqual({ status: "ok", service: "api" });
  });
});
