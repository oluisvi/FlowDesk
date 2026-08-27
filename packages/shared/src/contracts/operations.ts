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

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );
const OptionalUuidSchema = optional(z.string().uuid());
const nullable = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    schema.nullable().optional(),
  );
const NullableUuidSchema = nullable(z.string().uuid());
const NullableTextSchema = (max: number) => nullable(z.string().trim().max(max));
const NullableEmailSchema = nullable(z.string().trim().email());
const NullableDateTimeSchema = nullable(z.string().datetime());
const TagsSchema = z.array(z.string().trim().min(1).max(40)).max(12).default([]);

export const CreateClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: optional(z.string().trim().max(120)),
  email: optional(z.string().trim().email()),
  phone: optional(z.string().trim().max(40)),
  notes: optional(z.string().trim().max(5_000)),
  status: ClientStatusSchema.exclude(["ARCHIVED"]).default("ACTIVE"),
  assignedMemberId: OptionalUuidSchema,
  tags: TagsSchema,
});
export const UpdateClientSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  company: NullableTextSchema(120),
  email: NullableEmailSchema,
  phone: NullableTextSchema(40),
  notes: NullableTextSchema(5_000),
  status: ClientStatusSchema.exclude(["ARCHIVED"]).optional(),
  assignedMemberId: NullableUuidSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: optional(z.string().trim().max(5_000)),
  clientId: OptionalUuidSchema,
  status: ProjectStatusSchema.exclude(["ARCHIVED"]).default("PLANNED"),
  priority: PrioritySchema.default("MEDIUM"),
  deadline: optional(z.string().datetime()),
});
export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: NullableTextSchema(5_000),
  clientId: NullableUuidSchema,
  status: ProjectStatusSchema.exclude(["ARCHIVED"]).optional(),
  priority: PrioritySchema.optional(),
  deadline: NullableDateTimeSchema,
});

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optional(z.string().trim().max(10_000)),
  projectId: OptionalUuidSchema,
  assigneeId: OptionalUuidSchema,
  status: TaskStatusSchema.default("BACKLOG"),
  priority: PrioritySchema.default("MEDIUM"),
  dueDate: optional(z.string().datetime()),
  tags: TagsSchema,
});
export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: NullableTextSchema(10_000),
  projectId: NullableUuidSchema,
  assigneeId: NullableUuidSchema,
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  dueDate: NullableDateTimeSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});
export const CreateTaskCommentSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
});
export const AssignProjectMemberSchema = z.object({
  membershipId: z.string().uuid(),
});

export const ClientListQuerySchema = z.object({
  search: optional(z.string().trim().max(120)),
  status: ClientStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
export const ProjectListQuerySchema = z.object({
  search: optional(z.string().trim().max(120)),
  status: ProjectStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
export const TaskListQuerySchema = z.object({
  search: optional(z.string().trim().max(120)),
  status: TaskStatusSchema.optional(),
  projectId: OptionalUuidSchema,
  assigneeId: OptionalUuidSchema,
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export type ClientStatus = z.infer<typeof ClientStatusSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;
