import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createIdentityTestApp } from "./support/identity-test-app";

const password = "correct horse battery staple";

async function registerOwner(app: INestApplication) {
  const registration = await request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send({ email: "owner@example.com", name: "Owner", password })
    .expect(201);
  const token = registration.body.accessToken as string;
  const workspace = await request(app.getHttpServer())
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Studio" })
    .expect(201);
  return { token, workspaceId: workspace.body.id as string };
}

async function createTaskFixture(app: INestApplication) {
  const { token, workspaceId } = await registerOwner(app);
  const task = await request(app.getHttpServer())
    .post(`/api/v1/workspaces/${workspaceId}/tasks`)
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Briefing", status: "TODO", priority: "HIGH" })
    .expect(201);
  return { token, workspaceId, taskId: task.body.id as string };
}

describe("workspace operations", () => {
  let app: INestApplication | undefined;

  afterEach(async () => app?.close());

  it("records human activity when a task changes status", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId } = await registerOwner(app);
    const client = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Studio Nova", status: "ACTIVE" })
      .expect(201);
    const project = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Website",
        clientId: client.body.id,
        status: "ACTIVE",
        priority: "HIGH",
      })
      .expect(201);
    const task = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Briefing",
        projectId: project.body.id,
        status: "TODO",
        priority: "HIGH",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/tasks/${task.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "IN_PROGRESS" })
      .expect(200);

    const activity = await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${workspaceId}/activity?entityId=${task.body.id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(activity.body[0]).toMatchObject({
      actorType: "USER",
      action: "task.status_changed",
      entityId: task.body.id,
    });
  });

  it("creates and lists comments for a workspace-scoped task", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId, taskId } = await createTaskFixture(app);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Confirmar escopo com o cliente." })
      .expect(201);
    const comments = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(comments.body).toHaveLength(1);
    expect(comments.body[0]).toMatchObject({
      taskId,
      content: "Confirmar escopo com o cliente.",
    });
  });

  it("marks a workspace notification as read", async () => {
    const testApp = await createIdentityTestApp();
    ({ app } = testApp);
    const { token, workspaceId } = await registerOwner(app);
    const notification = await testApp.operations.createNotification({
      workspaceId,
      userId: testApp.repository.userIdByEmail("owner@example.com"),
      type: "TASK_ASSIGNED",
      title: "Nova tarefa",
      message: "Briefing foi atribuída a você.",
      targetPath: "/tasks/briefing",
    });

    await request(app.getHttpServer())
      .patch(
        `/api/v1/workspaces/${workspaceId}/notifications/${notification.id}/read`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.readAt).toBeTruthy());
  });

  it("returns dashboard totals computed from workspace data", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId, taskId } = await createTaskFixture(app);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DONE" })
      .expect(200);

    const dashboard = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/dashboard`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(dashboard.body).toMatchObject({
      tasks: { total: 1, completed: 1, pending: 0 },
    });
  });

  it("searches clients and excludes archived tasks from filtered lists", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId, taskId } = await createTaskFixture(app);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Studio Nova", company: "Nova Design", status: "ACTIVE" })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme", status: "INACTIVE" })
      .expect(201);

    const clients = await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${workspaceId}/clients?search=nova&status=ACTIVE`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(clients.body).toHaveLength(1);
    expect(clients.body[0].name).toBe("Studio Nova");

    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    const tasks = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/tasks?status=TODO`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(tasks.body).toEqual([]);
  });

  it("updates, lists, and archives clients and projects", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId } = await registerOwner(app);
    const client = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Studio", status: "ACTIVE" })
      .expect(201);
    const project = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Site",
        clientId: client.body.id,
        status: "PLANNED",
        priority: "HIGH",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/clients/${client.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Studio Nova" })
      .expect(200)
      .expect(({ body }) => expect(body.name).toBe("Studio Nova"));
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/projects/${project.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ACTIVE" })
      .expect(200);
    const projects = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/projects?status=ACTIVE`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(projects.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${workspaceId}/projects/${project.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${workspaceId}/clients/${client.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect([]);
  });

  it("lists notifications and marks all of the caller's notifications as read", async () => {
    const testApp = await createIdentityTestApp();
    ({ app } = testApp);
    const { token, workspaceId } = await registerOwner(app);
    const userId = testApp.repository.userIdByEmail("owner@example.com");
    for (const title of ["Primeira", "Segunda"]) {
      await testApp.operations.createNotification({
        workspaceId,
        userId,
        type: "SYSTEM",
        title,
        message: title,
        targetPath: null,
      });
    }

    const notifications = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/notifications`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(notifications.body).toHaveLength(2);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspaceId}/notifications/read-all`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    const read = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/notifications?unread=true`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(read.body).toEqual([]);
  });

  it("assigns and removes a workspace member from a project", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId } = await registerOwner(app);
    const project = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Portal", status: "ACTIVE", priority: "MEDIUM" })
      .expect(201);
    const members = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(
        `/api/v1/workspaces/${workspaceId}/projects/${project.body.id}/members`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ membershipId: members.body[0].id })
      .expect(201);
    const assigned = await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${workspaceId}/projects/${project.body.id}/members`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(assigned.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(
        `/api/v1/workspaces/${workspaceId}/projects/${project.body.id}/members/${members.body[0].id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  it("records creation activity for operational entities", async () => {
    ({ app } = await createIdentityTestApp());
    const { token, workspaceId } = await registerOwner(app);
    const client = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/clients`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nova", status: "ACTIVE" })
      .expect(201);
    const activity = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/activity?entityId=${client.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(activity.body[0]).toMatchObject({ action: "client.created", actorType: "USER" });
  });
});
