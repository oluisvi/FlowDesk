import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, it } from "vitest";
import { createIdentityTestApp } from "./support/identity-test-app";

const password = "correct horse battery staple";

describe("operations tenant security", () => {
  let app: INestApplication | undefined;

  afterEach(async () => app?.close());

  it("rejects an assignee from another workspace", async () => {
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
      .post(`/api/v1/workspaces/${workspaceA.body.id}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Unsafe assignment",
        assigneeId: membersB.body[0].id,
        status: "TODO",
        priority: "MEDIUM",
      })
      .expect(422);
  });

  it("returns 404 for a known client ID from another workspace", async () => {
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
    const foreignClient = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceB.body.id}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Foreign Client", status: "ACTIVE" })
      .expect(201);

    await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${workspaceA.body.id}/clients/${foreignClient.body.id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("rejects a project member from another workspace", async () => {
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
    const project = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceA.body.id}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Projeto A", status: "ACTIVE", priority: "MEDIUM" })
      .expect(201);
    const membersB = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceB.body.id}/members`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceA.body.id}/projects/${project.body.id}/members`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ membershipId: membersB.body[0].id })
      .expect(422);
  });
});
