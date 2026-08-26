import type {
  CreateClientInput,
  ClientStatus,
  CreateProjectInput,
  CreateTaskInput,
  ProjectStatus,
  UpdateTaskInput,
  TaskStatus,
  UpdateClientInput,
  UpdateProjectInput,
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
  abstract listClients(
    workspaceId: string,
    filters: { search?: string; status?: ClientStatus },
  ): Promise<ClientRecord[]>;
  abstract createClient(
    workspaceId: string,
    input: CreateClientInput,
  ): Promise<ClientRecord>;
  abstract findClient(
    workspaceId: string,
    clientId: string,
  ): Promise<ClientRecord | null>;
  abstract updateClient(
    workspaceId: string,
    clientId: string,
    input: UpdateClientInput,
  ): Promise<ClientRecord | null>;
  abstract archiveClient(
    workspaceId: string,
    clientId: string,
    now: Date,
  ): Promise<boolean>;
  abstract createProject(
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<ProjectRecord>;
  abstract findProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRecord | null>;
  abstract listProjects(
    workspaceId: string,
    filters: { status?: ProjectStatus },
  ): Promise<ProjectRecord[]>;
  abstract updateProject(
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectRecord | null>;
  abstract archiveProject(
    workspaceId: string,
    projectId: string,
    now: Date,
  ): Promise<boolean>;
  abstract createTask(
    workspaceId: string,
    input: CreateTaskInput,
  ): Promise<TaskRecord>;
  abstract listTasks(
    workspaceId: string,
    filters: { status?: TaskStatus },
  ): Promise<TaskRecord[]>;
  abstract findTask(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskRecord | null>;
  abstract updateTask(
    workspaceId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskRecord | null>;
  abstract archiveTask(
    workspaceId: string,
    taskId: string,
    now: Date,
  ): Promise<boolean>;
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
  abstract listNotifications(
    workspaceId: string,
    userId: string,
    unread?: boolean,
  ): Promise<NotificationRecord[]>;
  abstract markAllNotificationsRead(
    workspaceId: string,
    userId: string,
    now: Date,
  ): Promise<void>;
  abstract dashboard(
    workspaceId: string,
    userId: string,
  ): Promise<DashboardSummary>;
}
