import type {
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "@flowdesk/shared";

export interface ClientRecord extends CreateClientInput {
  id: string;
  workspaceId: string;
  archivedAt: Date | null;
}

export interface ProjectRecord extends CreateProjectInput {
  id: string;
  workspaceId: string;
  deadline?: string;
  archivedAt: Date | null;
}

export interface TaskRecord extends CreateTaskInput {
  id: string;
  workspaceId: string;
  dueDate?: string;
  archivedAt: Date | null;
}

export interface ActivityRecord {
  id: string;
  workspaceId: string;
  actorId: string;
  actorType: "USER" | "AUTOMATION";
  entityType: "CLIENT" | "PROJECT" | "TASK";
  entityId: string;
  action: string;
  createdAt: Date;
}

export interface TaskCommentRecord {
  id: string;
  workspaceId: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRecord {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  targetPath: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface DashboardSummary {
  tasks: { total: number; completed: number; pending: number };
  clients: { active: number };
  projects: { active: number };
  notifications: { unread: number };
}

export abstract class OperationsRepository {
  abstract createClient(
    workspaceId: string,
    input: CreateClientInput,
  ): Promise<ClientRecord>;
  abstract findClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientRecord | null>;
  abstract createProject(
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<ProjectRecord>;
  abstract findProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRecord | null>;
  abstract createTask(
    workspaceId: string,
    input: CreateTaskInput,
  ): Promise<TaskRecord>;
  abstract findTask(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskRecord | null>;
  abstract updateTask(
    workspaceId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskRecord | null>;
  abstract membershipExists(
    workspaceId: string,
    membershipId: string,
  ): Promise<boolean>;
  abstract recordActivity(
    input: Omit<ActivityRecord, "id" | "createdAt">,
  ): Promise<ActivityRecord>;
  abstract listActivity(
    workspaceId: string,
    entityId?: string,
  ): Promise<ActivityRecord[]>;
  abstract createComment(input: {
    workspaceId: string;
    taskId: string;
    authorId: string;
    content: string;
  }): Promise<TaskCommentRecord>;
  abstract listComments(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskCommentRecord[]>;
  abstract createNotification(
    input: Omit<NotificationRecord, "id" | "readAt" | "createdAt">,
  ): Promise<NotificationRecord>;
  abstract markNotificationRead(
    workspaceId: string,
    userId: string,
    notificationId: string,
    now: Date,
  ): Promise<NotificationRecord | null>;
  abstract dashboard(
    workspaceId: string,
    userId: string,
  ): Promise<DashboardSummary>;
}
