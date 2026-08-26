import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "@flowdesk/shared";
import { PrismaService } from "../common/prisma.service";
import {
  OperationsRepository,
  type ActivityRecord,
  type ClientRecord,
  type ProjectRecord,
  type TaskRecord,
} from "./operations.repository";

@Injectable()
export class PrismaOperationsRepository extends OperationsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  createClient(
    workspaceId: string,
    input: CreateClientInput,
  ): Promise<ClientRecord> {
    return this.prisma.client.create({
      data: { workspaceId, ...input },
    }) as Promise<ClientRecord>;
  }

  findClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({
      where: { id: clientId, workspaceId, archivedAt: null },
    }) as Promise<ClientRecord | null>;
  }

  createProject(
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<ProjectRecord> {
    return this.prisma.project.create({
      data: {
        ...input,
        workspaceId,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
      },
    }) as unknown as Promise<ProjectRecord>;
  }

  findProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRecord | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId, archivedAt: null },
    }) as unknown as Promise<ProjectRecord | null>;
  }

  createTask(workspaceId: string, input: CreateTaskInput): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        ...input,
        workspaceId,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
    }) as unknown as Promise<TaskRecord>;
  }

  findTask(workspaceId: string, taskId: string): Promise<TaskRecord | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, workspaceId, archivedAt: null },
    }) as unknown as Promise<TaskRecord | null>;
  }

  updateTask(
    workspaceId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskRecord | null> {
    return this.prisma.task.update({
      where: { id: taskId, workspaceId },
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
    }) as unknown as Promise<TaskRecord>;
  }

  async membershipExists(
    workspaceId: string,
    membershipId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.membership.count({
        where: { id: membershipId, workspaceId },
      })) > 0
    );
  }

  recordActivity(
    input: Omit<ActivityRecord, "id" | "createdAt">,
  ): Promise<ActivityRecord> {
    return this.prisma.activity.create({
      data: input,
    }) as Promise<ActivityRecord>;
  }

  listActivity(
    workspaceId: string,
    entityId?: string,
  ): Promise<ActivityRecord[]> {
    return this.prisma.activity.findMany({
      where: { workspaceId, entityId },
      orderBy: { createdAt: "desc" },
    }) as Promise<ActivityRecord[]>;
  }
}
