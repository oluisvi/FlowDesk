import request from "supertest";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { createIdentityTestApp } from "./support/identity-test-app";

const password = "correct horse battery staple";

function refreshCookie(response: request.Response): string {
  const cookies = response.headers["set-cookie"];
  const value = Array.isArray(cookies) ? cookies[0] : cookies;
  if (!value) throw new Error("refresh cookie not returned");
  return value.split(";", 1)[0];
}

describe("identity HTTP integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => app?.close());

  it("revokes a token family when a rotated refresh token is reused", async () => {
    ({ app } = await createIdentityTestApp());
    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "ada@example.com", name: "Ada", password })
      .expect(201);
    const firstCookie = refreshCookie(registered);

    const rotated = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstCookie)
      .expect(200);
    const rotatedCookie = refreshCookie(rotated);

    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", firstCookie).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", rotatedCookie).expect(401);
  });

  it("rejects expired invitations and prevents invitation reuse", async () => {
    const testApp = await createIdentityTestApp();
    ({ app } = testApp);
    const owner = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "owner@example.com", name: "Owner", password })
      .expect(201);
    const ownerToken = owner.body.accessToken as string;
    const workspace = await request(app.getHttpServer())
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Studio" })
      .expect(201);

    const expiredToken = "expired-invitation-token-0000000000000000";
    await testApp.repository.createInvitation({
      workspaceId: workspace.body.id as string,
      email: "expired@example.com",
      role: "MEMBER",
      tokenHash: createHash("sha256").update(expiredToken).digest("hex"),
      expiresAt: new Date("2026-08-26T11:00:00.000Z"),
      invitedById: owner.body.user.id as string,
    });
    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ token: expiredToken })
      .expect(410);

    const invited = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "owner@example.com", role: "MEMBER" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ token: invited.body.token })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ token: invited.body.token })
      .expect(410);
  });

  it("lists and revokes the caller's own sessions", async () => {
    ({ app } = await createIdentityTestApp());
    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "sessions@example.com", name: "Sessions", password })
      .expect(201);
    const token = registered.body.accessToken as string;
    const cookie = refreshCookie(registered);
    const sessions = await request(app.getHttpServer())
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(sessions.body).toHaveLength(1);
    expect(sessions.body[0]).not.toHaveProperty("tokenHash");

    await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${sessions.body[0].id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", cookie).expect(401);
  });

  it("uses password reset tokens once and revokes existing sessions", async () => {
    ({ app } = await createIdentityTestApp());
    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "reset@example.com", name: "Reset", password })
      .expect(201);
    const cookie = refreshCookie(registered);
    const recovery = await request(app.getHttpServer())
      .post("/api/v1/auth/password-recovery")
      .send({ email: "reset@example.com" })
      .expect(202);
    const resetToken = recovery.body.resetToken as string;
    const newPassword = "a new correct horse battery staple";

    await request(app.getHttpServer()).post("/api/v1/auth/password-reset").send({ token: resetToken, password: newPassword }).expect(204);
    await request(app.getHttpServer()).post("/api/v1/auth/password-reset").send({ token: resetToken, password: newPassword }).expect(410);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", cookie).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "reset@example.com", password: newPassword }).expect(200);
  });

  it("returns the same safe authentication error for unknown email and wrong password", async () => {
    ({ app } = await createIdentityTestApp());
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "known@example.com", name: "Known", password })
      .expect(201);
    const unknown = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "unknown@example.com", password }).expect(401);
    const wrong = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "known@example.com", password: "wrong" }).expect(401);
    expect(unknown.body.error.message).toBe("Authentication failed");
    expect(wrong.body.error.message).toBe("Authentication failed");
  });
});
