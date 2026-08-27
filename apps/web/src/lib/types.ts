export interface User {
  id: string;
  name: string;
  email: string;
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  workspace: { id: string; name: string; slug: string };
}

export interface Member {
  id: string;
  workspaceId?: string;
  userId?: string;
  role: WorkspaceRole;
  user: User;
}

export interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  tags: string[];
  assignedMemberId?: string | null;
  createdAt?: string;
  updatedAt: string;
  _count?: { projects: number };
  assignedMember?: { user: Pick<User, "name" | "email"> } | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadline?: string | null;
  clientId?: string | null;
  client?: { id: string; name: string; company?: string | null } | null;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  projectId?: string | null;
  assigneeId?: string | null;
  tags: string[];
  project?: { id: string; name: string } | null;
  assignee?: { user: User } | null;
  _count?: { comments: number };
}

export interface ActivityItem {
  id: string;
  actorId?: string | null;
  actorType: "USER" | "AUTOMATION" | "SYSTEM";
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  targetPath?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  draftDefinition: unknown;
  activeVersion?: number | null;
  updatedAt: string;
  _count?: { executions: number; versions: number };
  versions?: Array<{ id: string; version: number; checksum: string; createdAt: string }>;
  executions?: WorkflowExecution[];
}

export interface WorkflowStepExecution {
  id: string;
  nodeId: string;
  nodeType: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  attempt: number;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggerEventId: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  depth: number;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  workflow?: { name: string };
  workflowVersion?: { version: number };
  steps?: WorkflowStepExecution[];
}
