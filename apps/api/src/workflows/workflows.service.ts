import { createHash } from "node:crypto";
import {
  Injectable,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowDefinition,
} from "@flowdesk/shared";
import type { RequestIdentity } from "../authorization/request-identity.js";
import { PolicyService } from "../authorization/policy.service.js";
import { WorkspaceAccessService } from "../authorization/workspace-access.service.js";
import { PrismaService } from "../common/prisma.service.js";
import {
  validateWorkflow,
  type WorkflowValidationIssue,
} from "./workflow-validator.js";

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkspaceAccessService)
    private readonly access: WorkspaceAccessService,
    @Inject(PolicyService) private readonly policy: PolicyService,
  ) {}

  async list(identity: RequestIdentity, workspaceId: string) {
    await this.access.resolve(identity, workspaceId);
    return this.prisma.workflow.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { executions: true, versions: true } },
        executions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true, finishedAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.access.resolve(identity, workspaceId);
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, workspaceId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 10,
          select: { id: true, version: true, checksum: true, createdAt: true },
        },
        executions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            depth: true,
            error: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
    });
    if (!workflow) throw new NotFoundException("Workflow not found");
    return workflow;
  }

  async create(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateWorkflowInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workflow:write");

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          workspaceId,
          name: input.name,
          description: input.description,
          draftDefinition: input.definition,
          createdById: identity.userId,
        },
      });
      await tx.activity.create({
        data: {
          workspaceId,
          actorId: identity.userId,
          actorType: "USER",
          entityType: "WORKFLOW",
          entityId: workflow.id,
          action: "workflow.created",
          metadata: { name: workflow.name },
        },
      });
      return workflow;
    });
  }

  async update(
    identity: RequestIdentity,
    workspaceId: string,
    id: string,
    input: UpdateWorkflowInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workflow:write");

    const current = await this.prisma.workflow.findFirst({
      where: { id, workspaceId },
    });
    if (!current) throw new NotFoundException("Workflow not found");

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          draftDefinition: input.definition,
        },
      });
      await tx.activity.create({
        data: {
          workspaceId,
          actorId: identity.userId,
          actorType: "USER",
          entityType: "WORKFLOW",
          entityId: workflow.id,
          action: "workflow.updated",
        },
      });
      return workflow;
    });
  }

  async validate(
    identity: RequestIdentity,
    workspaceId: string,
    definition: unknown,
  ) {
    await this.access.resolve(identity, workspaceId);
    const structural = validateWorkflow(definition);
    if (!structural.valid) return structural;
    const references = await this.validateWorkspaceReferences(
      workspaceId,
      definition as WorkflowDefinition,
    );
    return {
      valid: references.length === 0,
      issues: references,
    };
  }

  async activate(identity: RequestIdentity, workspaceId: string, id: string) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workflow:activate");

    const current = await this.prisma.workflow.findFirst({
      where: { id, workspaceId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!current) throw new NotFoundException("Workflow not found");

    const structural = validateWorkflow(current.draftDefinition);
    if (!structural.valid) this.throwValidation(structural.issues);

    const definition = current.draftDefinition as unknown as WorkflowDefinition;
    const referenceIssues = await this.validateWorkspaceReferences(
      workspaceId,
      definition,
    );
    if (referenceIssues.length > 0) this.throwValidation(referenceIssues);

    const nextVersion = (current.versions[0]?.version ?? 0) + 1;
    const checksum = createHash("sha256")
      .update(JSON.stringify(definition))
      .digest("hex");

    return this.prisma.$transaction(async (tx) => {
      const immutableVersion = await tx.workflowVersion.create({
        data: {
          workflowId: id,
          version: nextVersion,
          definition,
          checksum,
        },
      });
      const workflow = await tx.workflow.update({
        where: { id },
        data: { status: "ACTIVE", activeVersion: nextVersion },
      });
      await tx.activity.create({
        data: {
          workspaceId,
          actorId: identity.userId,
          actorType: "USER",
          entityType: "WORKFLOW",
          entityId: id,
          action: "workflow.activated",
          metadata: { version: nextVersion, checksum },
        },
      });
      return { workflow, version: immutableVersion };
    });
  }

  async deactivate(identity: RequestIdentity, workspaceId: string, id: string) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workflow:activate");

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.workflow.updateMany({
        where: { id, workspaceId },
        data: { status: "INACTIVE" },
      });
      if (!result.count) throw new NotFoundException("Workflow not found");
      await tx.activity.create({
        data: {
          workspaceId,
          actorId: identity.userId,
          actorType: "USER",
          entityType: "WORKFLOW",
          entityId: id,
          action: "workflow.deactivated",
        },
      });
    });
  }

  async executions(
    identity: RequestIdentity,
    workspaceId: string,
    workflowId?: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    if (workflowId) {
      const exists = await this.prisma.workflow.count({
        where: { id: workflowId, workspaceId },
      });
      if (!exists) throw new NotFoundException("Workflow not found");
    }

    return this.prisma.workflowExecution.findMany({
      where: { workspaceId, workflowId },
      include: {
        workflow: { select: { name: true } },
        workflowVersion: { select: { version: true } },
        _count: { select: { steps: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async execution(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.access.resolve(identity, workspaceId);
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id, workspaceId },
      include: {
        workflow: { select: { id: true, name: true, status: true } },
        workflowVersion: true,
        steps: { orderBy: [{ createdAt: "asc" }, { attempt: "asc" }] },
      },
    });
    if (!execution) throw new NotFoundException("Execution not found");
    return execution;
  }

  private throwValidation(issues: WorkflowValidationIssue[]): never {
    throw new UnprocessableEntityException({
      code: "WORKFLOW_INVALID",
      message: "Workflow must be valid before activation",
      fields: Object.fromEntries(
        issues.map((issue, index) => [
          issue.nodeId ?? `workflow.${index}`,
          issue.message,
        ]),
      ),
    });
  }

  private async validateWorkspaceReferences(
    workspaceId: string,
    definition: WorkflowDefinition,
  ): Promise<WorkflowValidationIssue[]> {
    const issues: WorkflowValidationIssue[] = [];

    for (const node of definition.nodes) {
      const checks: Array<
        | { kind: "membership"; id: string | undefined }
        | { kind: "project"; id: string | undefined }
        | { kind: "client"; id: string | undefined }
      > = [];

      if (node.type === "condition") {
        const conditionReferenceKind = {
          assigneeId: "membership",
          projectId: "project",
          clientId: "client",
        } as const;
        const kind =
          conditionReferenceKind[
            node.config.field as keyof typeof conditionReferenceKind
          ];
        if (kind) {
          const values = Array.isArray(node.config.value)
            ? node.config.value
            : [node.config.value];
          for (const value of values) {
            if (typeof value === "string" && value) {
              checks.push({ kind, id: value });
            }
          }
        }
      }

      if (node.type === "action") {
        if (node.kind === "ASSIGN_MEMBER") {
          checks.push({ kind: "membership", id: node.config.membershipId });
          checks.push({ kind: "project", id: node.config.projectId });
        }
        if (node.kind === "SEND_NOTIFICATION") {
          checks.push({ kind: "membership", id: node.config.membershipId });
        }
        if (node.kind === "CREATE_TASK") {
          checks.push({ kind: "membership", id: node.config.assigneeId });
          checks.push({ kind: "project", id: node.config.projectId });
        }
        if (node.kind === "CREATE_PROJECT") {
          checks.push({ kind: "client", id: node.config.clientId });
        }
      }

      if (node.type !== "action" && node.type !== "condition") continue;

      for (const check of checks) {
        if (!check.id) continue;
        const exists = await this.referenceExists(
          workspaceId,
          check.kind,
          check.id,
        );
        if (!exists) {
          issues.push({
            code: "WORKFLOW_FOREIGN_REFERENCE",
            nodeId: node.id,
            message: `${check.kind} reference is not available in this workspace.`,
          });
        }
      }
    }

    return issues;
  }

  private async referenceExists(
    workspaceId: string,
    kind: "membership" | "project" | "client",
    id: string,
  ): Promise<boolean> {
    if (kind === "membership") {
      return (
        (await this.prisma.membership.count({ where: { id, workspaceId } })) > 0
      );
    }
    if (kind === "project") {
      return (
        (await this.prisma.project.count({
          where: { id, workspaceId, archivedAt: null },
        })) > 0
      );
    }
    return (
      (await this.prisma.client.count({
        where: { id, workspaceId, archivedAt: null },
      })) > 0
    );
  }
}
