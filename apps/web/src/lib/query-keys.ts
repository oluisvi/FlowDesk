export const qk = {
  workspaces: ["workspaces"] as const,
  members: (workspaceId: string) => ["members", workspaceId] as const,
  dashboard: (workspaceId: string) => ["dashboard", workspaceId] as const,
  clients: (workspaceId: string) => ["clients", workspaceId] as const,
  projects: (workspaceId: string) => ["projects", workspaceId] as const,
  tasks: (workspaceId: string) => ["tasks", workspaceId] as const,
  activity: (workspaceId: string) => ["activity", workspaceId] as const,
  notifications: (workspaceId: string) => ["notifications", workspaceId] as const,
  workflows: (workspaceId: string) => ["workflows", workspaceId] as const,
  workflow: (workspaceId: string, id: string) => ["workflow", workspaceId, id] as const,
  executions: (workspaceId: string) => ["executions", workspaceId] as const,
  workflowExecutions: (workspaceId: string, workflowId: string) =>
    ["executions", workspaceId, workflowId] as const,
  execution: (workspaceId: string, executionId: string) =>
    ["execution", workspaceId, executionId] as const,
};
