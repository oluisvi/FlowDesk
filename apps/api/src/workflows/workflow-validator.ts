import {
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowNode,
} from "@flowdesk/shared";

export interface WorkflowValidationIssue {
  code: string;
  nodeId?: string;
  message: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

export function validateWorkflow(value: unknown): WorkflowValidationResult {
  const parsed = WorkflowDefinitionSchema.safeParse(value);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "WORKFLOW_SCHEMA",
        message: `${issue.path.join(".") || "definition"}: ${issue.message}`,
      })),
    };
  }

  const definition = parsed.data;
  const issues: WorkflowValidationIssue[] = [];

  const priorityValues = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  const statusValues = {
    CLIENT: new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]),
    PROJECT: new Set(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
    TASK: new Set(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  } as const;
  const allStatusValues = new Set(
    Object.values(statusValues).flatMap((values) => Array.from(values)),
  );

  for (const node of definition.nodes) {
    if (node.type === "trigger" && node.kind === "STATUS_CHANGED") {
      const toStatus = node.config.toStatus;
      if (toStatus) {
        const allowed = node.config.entity
          ? statusValues[node.config.entity]
          : allStatusValues;
        if (!allowed.has(toStatus)) {
          issues.push({
            code: "WORKFLOW_TRIGGER_STATUS",
            nodeId: node.id,
            message: node.config.entity
              ? `Status ${toStatus} is not valid for ${node.config.entity}.`
              : `Status ${toStatus} is not a supported FlowDesk status.`,
          });
        }
      }
      continue;
    }

    if (node.type !== "condition") continue;

    if (
      (node.config.operator === "GTE" || node.config.operator === "LTE") &&
      node.config.field !== "priority"
    ) {
      issues.push({
        code: "WORKFLOW_CONDITION_OPERATOR",
        nodeId: node.id,
        message: "Ordered comparisons are supported only for priority.",
      });
    }

    if (node.config.operator === "IN" && !Array.isArray(node.config.value)) {
      issues.push({
        code: "WORKFLOW_CONDITION_VALUE",
        nodeId: node.id,
        message: "The IN operator requires a list of values.",
      });
    }

    if (node.config.operator !== "IN" && Array.isArray(node.config.value)) {
      issues.push({
        code: "WORKFLOW_CONDITION_VALUE",
        nodeId: node.id,
        message: "Only the IN operator accepts a list of values.",
      });
    }

    if (node.config.field === "priority") {
      const values = Array.isArray(node.config.value)
        ? node.config.value
        : [node.config.value];
      if (
        values.some(
          (value) => typeof value !== "string" || !priorityValues.has(value),
        )
      ) {
        issues.push({
          code: "WORKFLOW_CONDITION_VALUE",
          nodeId: node.id,
          message: "Priority conditions accept LOW, MEDIUM, HIGH or URGENT.",
        });
      }
    }
  }
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of definition.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        code: "WORKFLOW_DUPLICATE_NODE",
        nodeId: node.id,
        message: "Node ids must be unique.",
      });
    }
    nodeIds.add(node.id);
  }

  const triggers = definition.nodes.filter((node) => node.type === "trigger");
  if (triggers.length !== 1) {
    issues.push({
      code: "WORKFLOW_TRIGGER_COUNT",
      message: "A workflow requires exactly one trigger.",
    });
  }

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  for (const id of nodeIds) {
    outgoing.set(id, []);
    incoming.set(id, 0);
  }

  for (const edge of definition.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: "WORKFLOW_DUPLICATE_EDGE",
        message: `Edge id ${edge.id} is duplicated.`,
      });
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        code: "WORKFLOW_EDGE_TARGET",
        message: `Edge ${edge.id} points to a missing node.`,
      });
      continue;
    }

    if (edge.source === edge.target) {
      issues.push({
        code: "WORKFLOW_CYCLE",
        nodeId: edge.source,
        message: "A node cannot connect to itself.",
      });
    }

    outgoing.get(edge.source)?.push(edge.target);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  const trigger = triggers[0];
  if (trigger) {
    if ((incoming.get(trigger.id) ?? 0) > 0) {
      issues.push({
        code: "WORKFLOW_TRIGGER_INCOMING",
        nodeId: trigger.id,
        message: "The trigger cannot have incoming edges.",
      });
    }
    if ((outgoing.get(trigger.id)?.length ?? 0) === 0) {
      issues.push({
        code: "WORKFLOW_TRIGGER_EMPTY",
        nodeId: trigger.id,
        message: "Connect the trigger to at least one next step.",
      });
    }
  }

  for (const node of definition.nodes) {
    const incomingCount = incoming.get(node.id) ?? 0;
    if (node.type !== "trigger" && incomingCount === 0) {
      issues.push({
        code: "WORKFLOW_ORPHAN_NODE",
        nodeId: node.id,
        message: "Every non-trigger node needs an incoming connection.",
      });
    }
    // V1 intentionally models a tree/linear flow. Multi-parent merges make a
    // false condition ambiguous because another branch could still reach the
    // same action. Reject them until explicit branch/join semantics exist.
    if (node.type !== "trigger" && incomingCount > 1) {
      issues.push({
        code: "WORKFLOW_MULTI_PARENT",
        nodeId: node.id,
        message: "A V1 workflow step can have only one incoming connection.",
      });
    }
  }

  const degree = new Map(incoming);
  const queue = definition.nodes
    .filter((node) => (degree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  let visited = 0;

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    visited += 1;
    for (const target of outgoing.get(id) ?? []) {
      const next = (degree.get(target) ?? 0) - 1;
      degree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }

  if (visited !== nodeIds.size) {
    issues.push({
      code: "WORKFLOW_CYCLE",
      message: "Workflow contains a cycle.",
    });
  }

  if (trigger) {
    const reachable = new Set<string>();
    const stack = [trigger.id];
    while (stack.length > 0) {
      const id = stack.pop();
      if (!id || reachable.has(id)) continue;
      reachable.add(id);
      stack.push(...(outgoing.get(id) ?? []));
    }
    for (const id of nodeIds) {
      if (!reachable.has(id)) {
        issues.push({
          code: "WORKFLOW_UNREACHABLE",
          nodeId: id,
          message: "Every node must be reachable from the trigger.",
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function triggerMatches(
  node: WorkflowNode,
  event: {
    eventType: string;
    aggregateType: string;
    payload: Record<string, unknown>;
  },
): boolean {
  if (node.type !== "trigger") return false;

  const expected = {
    CLIENT_CREATED: "client.created",
    PROJECT_CREATED: "project.created",
    TASK_COMPLETED: "task.completed",
    STATUS_CHANGED: "*.status_changed",
  } as const;

  const eventTypeMatches =
    expected[node.kind] === event.eventType ||
    (node.kind === "STATUS_CHANGED" &&
      event.eventType.endsWith(".status_changed"));
  if (!eventTypeMatches) return false;

  if (node.kind === "STATUS_CHANGED") {
    if (node.config.entity && node.config.entity !== event.aggregateType)
      return false;
    const eventStatus =
      typeof event.payload.status === "string" ? event.payload.status : "";
    if (node.config.toStatus && node.config.toStatus !== eventStatus) {
      return false;
    }
  }

  return true;
}

export function topologicalNodes(
  definition: WorkflowDefinition,
): WorkflowNode[] {
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const incoming = new Map(definition.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(
    definition.nodes.map((node) => [node.id, [] as string[]]),
  );

  for (const edge of definition.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const queue = definition.nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const result: WorkflowNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    const node = nodes.get(id);
    if (node) result.push(node);
    for (const target of outgoing.get(id) ?? []) {
      const next = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, next);
      if (next === 0) queue.push(target);
    }
  }

  return result;
}
