import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/common/prisma.service.js";
import { auth, register, resetTestDatabase, startTestApp } from "./support/test-app.js";

let app: INestApplication;
let prisma: PrismaService;
beforeAll(async () => ({ app, prisma } = await startTestApp()));
beforeEach(async () => resetTestDatabase(prisma));
afterAll(async () => app.close());

describe("authentication", () => {
  it("registers, rotates a refresh token and revokes the reused family", async () => {
    const session = await register(app, "owner@flowdesk.test");
    const rotated = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie)
      .expect(200);
    const nextCookie = String(rotated.headers["set-cookie"]?.[0] ?? "");
    expect(nextCookie).toContain("flowdesk_refresh=");
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", nextCookie)
      .expect(401);
  });

  it("lists and revokes an owned session", async () => {
    const session = await register(app, "sessions@flowdesk.test");
    const list = await request(app.getHttpServer())
      .get("/api/v1/auth/sessions")
      .set(auth(session.accessToken))
      .expect(200);
    expect(list.body).toHaveLength(1);
    await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${list.body[0].id as string}`)
      .set(auth(session.accessToken))
      .expect(204);
  });

  it("keeps password recovery enumeration-safe", async () => {
    await register(app, "recovery@flowdesk.test");
    const existing = await request(app.getHttpServer()).post("/api/v1/auth/password-recovery").send({ email: "recovery@flowdesk.test" }).expect(202);
    const missing = await request(app.getHttpServer()).post("/api/v1/auth/password-recovery").send({ email: "missing@flowdesk.test" }).expect(202);
    expect(existing.body.accepted).toBe(true);
    expect(missing.body).toEqual({ accepted: true });
  });

  it("revokes active sessions when a password reset succeeds", async () => {
    const session = await register(app, "reset@flowdesk.test");
    const recovery = await request(app.getHttpServer())
      .post("/api/v1/auth/password-recovery")
      .send({ email: "reset@flowdesk.test" })
      .expect(202);
    expect(typeof recovery.body.resetToken).toBe("string");

    await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset")
      .send({ token: recovery.body.resetToken, password: "NewPassword123!" })
      .expect(204);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "reset@flowdesk.test", password: "NewPassword123!" })
      .expect(200);
  });
});
