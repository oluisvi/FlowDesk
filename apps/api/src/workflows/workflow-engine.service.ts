import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowNode,
} from "@flowdesk/shared";
import { PrismaService } from "../common/prisma.service.js";
import {
  AutomationActionsService,
  type ActionExecutionContext,
} from "./automation-actions.service.js";
import { evaluateCondition } from "./condition-evaluator.js";
import { topologicalNodes, triggerMatches } from "./workflow-validator.js";

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actions: AutomationActionsService,
  ) {}

  async processEvent(eventId: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: eventId } });
    if (!event) return;

    const maxDepth = Number(process.env.WORKFLOW_MAX_DEPTH ?? 5);
    if (event.depth > maxDepth) return;

    const causation = (event.causation ?? {}) as Record<string, unknown>;
    const originatingWorkflowId =
      typeof causation.workflowId === "string" ? causation.workflowId : null;
    const workflowChain = Array.isArray(causation.workflowChain)
      ? causation.workflowChain.filter(
          (item): item is string => typeof item === "string",
        )
      : [];

    const workflows = await this.prisma.workflow.findMany({
      where: {
        workspaceId: event.workspaceId,
        status: "ACTIVE",
        activeVersion: { not: null },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const workflow of workflows) {
      // A workflow never consumes events it emitted itself. This turns the depth
      // limit into a second line of defence instead of the primary loop breaker.
      if (
        originatingWorkflowId === workflow.id ||
        workflowChain.includes(workflow.id)
      ) continue;
      if (workflow.activeVersion == null) continue;

      const version = await this.prisma.workflowVersion.findUnique({
        where: {
          workflowId_version: {
            workflowId: workflow.id,
            version: workflow.activeVersion,
          },
        },
      });
      if (!version) continue;

      const parsed = WorkflowDefinitionSchema.safeParse(version.definition);
      if (!parsed.success) continue;

      const payload = event.payload as Record<string, unknown>;
      const trigger = parsed.data.nodes.find((node) =>
        triggerMatches(node, {
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          payload,
        }),
      );
      if (!trigger) continue;

      await this.execute({
        workflowId: workflow.id,
        versionId: version.id,
        definition: parsed.data,
        eventId: event.id,
        workspaceId: event.workspaceId,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload,
        depth: event.depth,
        causation,
      });
    }
  }

  private async execute(input: {
    workflowId: string;
    versionId: string;
    definition: WorkflowDefinition;
    eventId: string;
    workspaceId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    depth: number;
    causation: Record<string, unknown>;
  }): Promise<void> {
    let execution = await this.prisma.workflowExecution.findUnique({
      where: {
        workflowId_triggerEventId: {
          workflowId: input.workflowId,
          triggerEventId: input.eventId,
        },
      },
    });

    if (execution?.status === "SUCCEEDED") return;

    if (!execution) {
      execution = await this.prisma.workflowExecution.create({
        data: {
          workspaceId: input.workspaceId,
          workflowId: input.workflowId,
          workflowVersionId: input.versionId,
          triggerEventId: input.eventId,
          status: "RUNNING",
          depth: input.depth,
          startedAt: new Date(),
        },
      });
    } else {
      execution = await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "RUNNING",
          startedAt: execution.startedAt ?? new Date(),
          finishedAt: null,
          error: null,
        },
      });
    }

    const outputs: Record<string, Record<string, unknown>> = {};
    const blocked = new Set<string>();
    let actionCount = 0;
    const maxActions = Number(process.env.WORKFLOW_MAX_ACTIONS ?? 25);

    try {
      for (const node of topologicalNodes(input.definition)) {
        if (blocked.has(node.id)) {
          await this.recordStep(execution.id, node, {
            status: "SKIPPED",
            output: { reason: "condition_false" },
          });
          continue;
        }

        if (node.type === "trigger") {
          await this.recordStep(execution.id, node, {
            status: "SUCCEEDED",
            input: {
              eventType: input.eventType,
              aggregateType: input.aggregateType,
              aggregateId: input.aggregateId,
            },
            output: { matched: true },
          });
          continue;
        }

        if (node.type === "condition") {
          const passed = evaluateCondition(node, input.payload);
          await this.recordStep(execution.id, node, {
            status: "SUCCEEDED",
            input: {
              field: node.config.field,
              operator: node.config.operator,
              expected: node.config.value,
              actual: input.payload[node.config.field],
            },
            output: { passed },
          });
          if (!passed) {
            for (const id of this.descendants(input.definition, node.id)) {
              blocked.add(id);
            }
          }
          continue;
        }

        actionCount += 1;
        if (actionCount > maxActions) {
          throw new Error(`Workflow exceeded ${maxActions} actions`);
        }

        const attempt = await this.nextAttempt(execution.id, node.id);
        const step = await this.prisma.workflowStepExecution.create({
          data: {
            executionId: execution.id,
            nodeId: node.id,
            nodeType: `action:${node.kind}`,
            status: "RUNNING",
            attempt,
            startedAt: new Date(),
            input: { config: node.config, eventId: input.eventId },
          },
        });

        const context: ActionExecutionContext = {
          workspaceId: input.workspaceId,
          workflowId: input.workflowId,
          executionId: execution.id,
          eventId: input.eventId,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          payload: input.payload,
          depth: input.depth,
          outputs,
          previous: Object.values(outputs).at(-1),
          causation: input.causation,
        };

        try {
          const output = await this.actions.execute(node, context);
          outputs[node.id] = output;
          await this.prisma.workflowStepExecution.update({
            where: { id: step.id },
            data: {
              status: "SUCCEEDED",
              output: output as Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          });
        } catch (error) {
          await this.prisma.workflowStepExecution.update({
            where: { id: step.id },
            data: {
              status: "FAILED",
              error: this.errorMessage(error),
              finishedAt: new Date(),
            },
          });
          throw error;
        }
      }

      await this.prisma.$transaction([
        this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: "SUCCEEDED", error: null, finishedAt: new Date() },
        }),
        this.prisma.activity.create({
          data: {
            workspaceId: input.workspaceId,
            actorId: input.workflowId,
            actorType: "AUTOMATION",
            entityType: "WORKFLOW",
            entityId: input.workflowId,
            action: "workflow.execution_succeeded",
            metadata: { executionId: execution.id, triggerEventId: input.eventId },
          },
        }),
      ]);
    } catch (error) {
      const message = this.errorMessage(error);
      await this.prisma.$transaction([
        this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: "FAILED", error: message, finishedAt: new Date() },
        }),
        this.prisma.activity.create({
          data: {
            workspaceId: input.workspaceId,
            actorId: input.workflowId,
            actorType: "AUTOMATION",
            entityType: "WORKFLOW",
            entityId: input.workflowId,
            action: "workflow.execution_failed",
            metadata: { executionId: execution.id, message },
          },
        }),
      ]);
      throw error;
    }
  }

  private descendants(definition: WorkflowDefinition, start: string): Set<string> {
    const outgoing = new Map<string, string[]>();
    for (const node of definition.nodes) outgoing.set(node.id, []);
    for (const edge of definition.edges) outgoing.get(edge.source)?.push(edge.target);

    const result = new Set<string>();
    const stack = [...(outgoing.get(start) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop();
      if (!id || result.has(id)) continue;
      result.add(id);
      stack.push(...(outgoing.get(id) ?? []));
    }
    return result;
  }

  private async recordStep(
    executionId: string,
    node: WorkflowNode,
    input: {
      status: "SUCCEEDED" | "SKIPPED";
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
    },
  ) {
    const attempt = await this.nextAttempt(executionId, node.id);
    return this.prisma.workflowStepExecution.create({
      data: {
        executionId,
        nodeId: node.id,
        nodeType:
          node.type === "action"
            ? `action:${node.kind}`
            : node.type === "trigger"
              ? `trigger:${node.kind}`
              : `condition:${node.kind}`,
        status: input.status,
        attempt,
        startedAt: new Date(),
        finishedAt: new Date(),
        input: input.input as Prisma.InputJsonValue | undefined,
        output: input.output as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async nextAttempt(executionId: string, nodeId: string): Promise<number> {
    return (
      (await this.prisma.workflowStepExecution.count({
        where: { executionId, nodeId },
      })) + 1
    );
  }

  private errorMessage(error: unknown): string {
    const value = error instanceof Error ? error.message : "Workflow failed";
    return value.slice(0, 2_000);
  }
}
