import { Inject, Injectable } from "@nestjs/common";
import type {
  ClientStatus,
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  TaskStatus,
  UpdateTaskInput,
} from "@flowdesk/shared";
import { PrismaService } from "../common/prisma.service";
import {
  OperationsRepository,
  type ActivityRecord,
  type ClientRecord,
  type DashboardSummary,
  type NotificationRecord,
  type ProjectRecord,
  type TaskCommentRecord,
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

  listClients(
    workspaceId: string,
    filters: { search?: string; status?: ClientStatus },
  ): Promise<ClientRecord[]> {
    return this.prisma.client.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        status: filters.status,
        OR: filters.search
          ? [
              { name: { contains: filters.search, mode: "insensitive" } },
              { company: { contains: filters.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { name: "asc" },
    }) as Promise<ClientRecord[]>;
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

  listTasks(
    workspaceId: string,
    filters: { status?: TaskStatus },
  ): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: { workspaceId, archivedAt: null, status: filters.status },
      orderBy: { createdAt: "desc" },
    }) as unknown as Promise<TaskRecord[]>;
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

  async archiveTask(
    workspaceId: string,
    taskId: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.prisma.task.updateMany({
      where: { id: taskId, workspaceId, archivedAt: null },
      data: { archivedAt: now },
    });
    return result.count > 0;
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

  createComment(input: {
    workspaceId: string;
    taskId: string;
    authorId: string;
    content: string;
  }): Promise<TaskCommentRecord> {
    return this.prisma.taskComment.create({
      data: input,
    }) as Promise<TaskCommentRecord>;
  }

  listComments(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskCommentRecord[]> {
    return this.prisma.taskComment.findMany({
      where: { workspaceId, taskId },
      orderBy: { createdAt: "asc" },
    }) as Promise<TaskCommentRecord[]>;
  }

  createNotification(
    input: Omit<NotificationRecord, "id" | "readAt" | "createdAt">,
  ): Promise<NotificationRecord> {
    return this.prisma.notification.create({
      data: input,
    }) as Promise<NotificationRecord>;
  }

  markNotificationRead(
    workspaceId: string,
    userId: string,
    notificationId: string,
    now: Date,
  ): Promise<NotificationRecord | null> {
    return this.prisma.notification.update({
      where: { id: notificationId, workspaceId, userId },
      data: { readAt: now },
    }) as Promise<NotificationRecord>;
  }

  async dashboard(
    workspaceId: string,
    userId: string,
  ): Promise<DashboardSummary> {
    const [total, completed, activeClients, activeProjects, unread] =
      await Promise.all([
        this.prisma.task.count({ where: { workspaceId, archivedAt: null } }),
        this.prisma.task.count({
          where: { workspaceId, archivedAt: null, status: "DONE" },
        }),
        this.prisma.client.count({
          where: { workspaceId, archivedAt: null, status: "ACTIVE" },
        }),
        this.prisma.project.count({
          where: { workspaceId, archivedAt: null, status: "ACTIVE" },
        }),
        this.prisma.notification.count({
          where: { workspaceId, userId, readAt: null },
        }),
      ]);
    return {
      tasks: { total, completed, pending: total - completed },
      clients: { active: activeClients },
      projects: { active: activeProjects },
      notifications: { unread },
    };
  }
}
