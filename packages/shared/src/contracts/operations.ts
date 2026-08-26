import { z } from "zod";

export const ClientStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const ProjectStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);
export const TaskStatusSchema = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
]);
export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const CreateClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional(),
  email: z.email().optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(5_000).optional(),
  status: ClientStatusSchema.default("ACTIVE"),
  assignedMemberId: z.uuid().optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5_000).optional(),
  clientId: z.uuid().optional(),
  status: ProjectStatusSchema.default("PLANNED"),
  priority: PrioritySchema.default("MEDIUM"),
  deadline: z.iso.datetime().optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).optional(),
  projectId: z.uuid().optional(),
  assigneeId: z.uuid().optional(),
  status: TaskStatusSchema.default("BACKLOG"),
  priority: PrioritySchema.default("MEDIUM"),
  dueDate: z.iso.datetime().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();
export const CreateTaskCommentSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ClientStatus = z.infer<typeof ClientStatusSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
