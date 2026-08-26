import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory";

describe("health integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("serves the versioned health contract over HTTP", async () => {
    app = await createApp();
    await app.init();

    const response = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);

    expect(response.body).toEqual({ status: "ok", service: "api" });
  });
});
