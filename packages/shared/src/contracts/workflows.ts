import { z } from "zod";
import { ClientStatusSchema, PrioritySchema, ProjectStatusSchema, TaskStatusSchema } from "./operations.js";

export const WorkflowStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE"]);
export const WorkflowTriggerKindSchema = z.enum([
  "CLIENT_CREATED",
  "PROJECT_CREATED",
  "TASK_COMPLETED",
  "STATUS_CHANGED",
]);
export const WorkflowActionKindSchema = z.enum([
  "CREATE_TASK",
  "CREATE_PROJECT",
  "ASSIGN_MEMBER",
  "CHANGE_STATUS",
  "SEND_NOTIFICATION",
]);
export const WorkflowConditionOperatorSchema = z.enum([
  "EQ",
  "NEQ",
  "GTE",
  "LTE",
  "IN",
]);

const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const StatusChangedTriggerConfigSchema = z.object({
  entity: z.enum(["CLIENT", "PROJECT", "TASK"]).optional(),
  toStatus: z.string().trim().max(40).optional(),
});

export const TriggerNodeSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("trigger"),
  kind: WorkflowTriggerKindSchema,
  position: PositionSchema,
  config: StatusChangedTriggerConfigSchema.default({}),
});

export const ConditionNodeSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("condition"),
  kind: z.literal("FIELD_COMPARE"),
  position: PositionSchema,
  config: z.object({
    field: z.enum([
      "status",
      "priority",
      "assigneeId",
      "clientId",
      "projectId",
      "actorId",
    ]),
    operator: WorkflowConditionOperatorSchema,
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.string()).max(20),
    ]),
  }),
});

const ActionBaseSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal("action"),
  position: PositionSchema,
});

const CreateProjectActionSchema = ActionBaseSchema.extend({
  kind: z.literal("CREATE_PROJECT"),
  config: z.object({
    name: z.string().trim().min(1).max(160),
    clientId: z.string().uuid().optional(),
    useEventClient: z.boolean().default(true),
    status: ProjectStatusSchema.exclude(["ARCHIVED"]).default("PLANNED"),
    priority: PrioritySchema.default("MEDIUM"),
  }),
});

const CreateTaskActionSchema = ActionBaseSchema.extend({
  kind: z.literal("CREATE_TASK"),
  config: z.object({
    title: z.string().trim().min(1).max(200),
    projectId: z.string().uuid().optional(),
    usePreviousProject: z.boolean().default(false),
    assigneeId: z.string().uuid().optional(),
    status: TaskStatusSchema.default("TODO"),
    priority: PrioritySchema.default("MEDIUM"),
  }),
});

const AssignMemberActionSchema = ActionBaseSchema.extend({
  kind: z.literal("ASSIGN_MEMBER"),
  config: z.object({
    membershipId: z.string().uuid(),
    target: z.enum(["previousTask", "previousProject", "eventTask", "eventProject"]),
    projectId: z.string().uuid().optional(),
  }),
});

const ChangeStatusActionSchema = ActionBaseSchema.extend({
  kind: z.literal("CHANGE_STATUS"),
  config: z.discriminatedUnion("target", [
    z.object({ target: z.literal("task"), status: TaskStatusSchema }),
    z.object({ target: z.literal("project"), status: ProjectStatusSchema.exclude(["ARCHIVED"]) }),
    z.object({ target: z.literal("client"), status: ClientStatusSchema.exclude(["ARCHIVED"]) }),
  ]),
});

const SendNotificationActionSchema = ActionBaseSchema.extend({
  kind: z.literal("SEND_NOTIFICATION"),
  config: z.object({
    membershipId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(500),
    targetPath: z.string().trim().max(500).optional(),
  }),
});

export const ActionNodeSchema = z.discriminatedUnion("kind", [
  CreateProjectActionSchema,
  CreateTaskActionSchema,
  AssignMemberActionSchema,
  ChangeStatusActionSchema,
  SendNotificationActionSchema,
]);

export const WorkflowNodeSchema = z.union([
  TriggerNodeSchema,
  ConditionNodeSchema,
  ActionNodeSchema,
]);
export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1).max(120),
  source: z.string().min(1).max(80),
  target: z.string().min(1).max(80),
});
export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).min(1).max(50),
  edges: z.array(WorkflowEdgeSchema).max(100),
});
export const CreateWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1_000).optional(),
  definition: WorkflowDefinitionSchema,
});
export const UpdateWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(1_000).optional(),
  definition: WorkflowDefinitionSchema.optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowTriggerKind = z.infer<typeof WorkflowTriggerKindSchema>;
export type WorkflowActionKind = z.infer<typeof WorkflowActionKindSchema>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
