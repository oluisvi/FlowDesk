import { Inject, Injectable } from "@nestjs/common";
import type {
  ClientStatus,
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  TaskStatus,
  ProjectStatus,
  UpdateClientInput,
  UpdateProjectInput,
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
  type ProjectMemberRecord,
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

  async updateClient(
    workspaceId: string,
    clientId: string,
    input: UpdateClientInput,
  ): Promise<ClientRecord | null> {
    const result = await this.prisma.client.updateMany({
      where: { id: clientId, workspaceId, archivedAt: null },
      data: input,
    });
    return result.count ? this.findClient(workspaceId, clientId) : null;
  }

  async archiveClient(
    workspaceId: string,
    clientId: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.prisma.client.updateMany({
      where: { id: clientId, workspaceId, archivedAt: null },
      data: { archivedAt: now },
    });
    return result.count > 0;
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

  listProjects(
    workspaceId: string,
    filters: { status?: ProjectStatus },
  ): Promise<ProjectRecord[]> {
    return this.prisma.project.findMany({
      where: { workspaceId, archivedAt: null, status: filters.status },
      orderBy: { createdAt: "desc" },
    }) as unknown as Promise<ProjectRecord[]>;
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectRecord | null> {
    const result = await this.prisma.project.updateMany({
      where: { id: projectId, workspaceId, archivedAt: null },
      data: {
        ...input,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
      },
    });
    return result.count ? this.findProject(workspaceId, projectId) : null;
  }

  async archiveProject(
    workspaceId: string,
    projectId: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.prisma.project.updateMany({
      where: { id: projectId, workspaceId, archivedAt: null },
      data: { archivedAt: now },
    });
    return result.count > 0;
  }

  assignProjectMember(
    workspaceId: string,
    projectId: string,
    membershipId: string,
  ): Promise<ProjectMemberRecord> {
    return this.prisma.projectMember.upsert({
      where: { projectId_membershipId: { projectId, membershipId } },
      create: { workspaceId, projectId, membershipId },
      update: {},
    });
  }

  listProjectMembers(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectMemberRecord[]> {
    return this.prisma.projectMember.findMany({
      where: { workspaceId, projectId },
      orderBy: { createdAt: "asc" },
    });
  }

  async removeProjectMember(
    workspaceId: string,
    projectId: string,
    membershipId: string,
  ): Promise<boolean> {
    const result = await this.prisma.projectMember.deleteMany({
      where: { workspaceId, projectId, membershipId },
    });
    return result.count > 0;
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

  listNotifications(
    workspaceId: string,
    userId: string,
    unread?: boolean,
  ): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: {
        workspaceId,
        userId,
        readAt:
          unread === undefined ? undefined : unread ? null : { not: null },
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<NotificationRecord[]>;
  }

  async markAllNotificationsRead(
    workspaceId: string,
    userId: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { workspaceId, userId, readAt: null },
      data: { readAt: now },
    });
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
