import { randomUUID } from "node:crypto";
import type {
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "@flowdesk/shared";
import {
  OperationsRepository,
  type ActivityRecord,
  type ClientRecord,
  type ProjectRecord,
  type TaskRecord,
} from "../../src/operations/operations.repository";
import type { InMemoryIdentityRepository } from "./in-memory-identity.repository";

export class InMemoryOperationsRepository extends OperationsRepository {
  private readonly clients: ClientRecord[] = [];
  private readonly projects: ProjectRecord[] = [];
  private readonly tasks: TaskRecord[] = [];
  private readonly activities: ActivityRecord[] = [];

  constructor(private readonly identity: InMemoryIdentityRepository) {
    super();
  }

  async createClient(
    workspaceId: string,
    input: CreateClientInput,
  ): Promise<ClientRecord> {
    const record = {
      id: randomUUID(),
      workspaceId,
      ...input,
      archivedAt: null,
    };
    this.clients.push(record);
    return record;
  }

  async findClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientRecord | null> {
    return (
      this.clients.find(
        (client) =>
          client.workspaceId === workspaceId &&
          client.id === clientId &&
          !client.archivedAt,
      ) ?? null
    );
  }

  async createProject(
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<ProjectRecord> {
    const record = {
      id: randomUUID(),
      workspaceId,
      ...input,
      archivedAt: null,
    };
    this.projects.push(record);
    return record;
  }

  async findProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRecord | null> {
    return (
      this.projects.find(
        (project) =>
          project.workspaceId === workspaceId &&
          project.id === projectId &&
          !project.archivedAt,
      ) ?? null
    );
  }

  async createTask(
    workspaceId: string,
    input: CreateTaskInput,
  ): Promise<TaskRecord> {
    const record = {
      id: randomUUID(),
      workspaceId,
      ...input,
      archivedAt: null,
    };
    this.tasks.push(record);
    return record;
  }

  async findTask(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskRecord | null> {
    return (
      this.tasks.find(
        (task) =>
          task.workspaceId === workspaceId &&
          task.id === taskId &&
          !task.archivedAt,
      ) ?? null
    );
  }

  async updateTask(
    workspaceId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskRecord | null> {
    const task = await this.findTask(workspaceId, taskId);
    if (!task) return null;
    Object.assign(task, input);
    return task;
  }

  membershipExists(
    workspaceId: string,
    membershipId: string,
  ): Promise<boolean> {
    return this.identity.membershipExists(workspaceId, membershipId);
  }

  async recordActivity(
    input: Omit<ActivityRecord, "id" | "createdAt">,
  ): Promise<ActivityRecord> {
    const record = { id: randomUUID(), ...input, createdAt: new Date() };
    this.activities.unshift(record);
    return record;
  }

  async listActivity(
    workspaceId: string,
    entityId?: string,
  ): Promise<ActivityRecord[]> {
    return this.activities.filter(
      (activity) =>
        activity.workspaceId === workspaceId &&
        (!entityId || activity.entityId === entityId),
    );
  }
}
