import request from "supertest";
import { afterEach, describe, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { createIdentityTestApp } from "./support/identity-test-app";

const password = "correct horse battery staple";

describe("workspace tenant isolation", () => {
  let app: INestApplication | undefined;

  afterEach(async () => app?.close());

  it("returns 404 for a known membership ID from another workspace", async () => {
    ({ app } = await createIdentityTestApp());
    const registration = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "owner@example.com", name: "Owner", password })
      .expect(201);
    const token = registration.body.accessToken as string;
    const workspaceA = await request(app.getHttpServer())
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Workspace A" })
      .expect(201);
    const workspaceB = await request(app.getHttpServer())
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Workspace B" })
      .expect(201);
    const membersB = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceB.body.id}/members`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${workspaceA.body.id}/members/${membersB.body[0].id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("enforces role changes and workspace mutation through centralized access", async () => {
    ({ app } = await createIdentityTestApp());
    const owner = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "owner@example.com", name: "Owner", password })
      .expect(201);
    const member = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "member@example.com", name: "Member", password })
      .expect(201);
    const ownerToken = owner.body.accessToken as string;
    const memberToken = member.body.accessToken as string;
    const workspace = await request(app.getHttpServer())
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Studio" })
      .expect(201);
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "member@example.com", role: "MEMBER" })
      .expect(201);
    const accepted = await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ token: invitation.body.token })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspace.body.id}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ name: "Escalated" })
      .expect(403);
    await request(app.getHttpServer())
      .patch(
        `/api/v1/workspaces/${workspace.body.id}/members/${accepted.body.id}`,
      )
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "VIEWER" })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/invitations`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ email: "another@example.com", role: "MEMBER" })
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspace.body.id}/members`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);
  });

  it("prevents the sole owner from leaving and removes ordinary members cleanly", async () => {
    ({ app } = await createIdentityTestApp());
    const owner = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "owner@example.com", name: "Owner", password })
      .expect(201);
    const member = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "member@example.com", name: "Member", password })
      .expect(201);
    const ownerToken = owner.body.accessToken as string;
    const memberToken = member.body.accessToken as string;
    const workspace = await request(app.getHttpServer())
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Studio" })
      .expect(201);
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "member@example.com", role: "MEMBER" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ token: invitation.body.token })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/leave`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.body.id}/switch`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(404);
  });
});
