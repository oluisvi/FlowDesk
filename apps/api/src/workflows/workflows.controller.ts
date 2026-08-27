import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
} from "@flowdesk/shared";
import { AccessGuard } from "../auth/access.guard.js";
import { CurrentIdentity } from "../auth/current-identity.decorator.js";
import type { RequestIdentity } from "../authorization/request-identity.js";
import { parseBody } from "../common/validation.js";
import { WorkflowsService } from "./workflows.service.js";

@Controller("workspaces/:workspaceId")
@UseGuards(AccessGuard)
export class WorkflowsController {
  constructor(
    @Inject(WorkflowsService) private readonly workflows: WorkflowsService,
  ) {}

  @Get("workflows")
  list(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workflows.list(identity, workspaceId);
  }

  @Post("workflows")
  create(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.workflows.create(
      identity,
      workspaceId,
      parseBody(CreateWorkflowSchema, body),
    );
  }

  @Post("workflows/validate")
  validate(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.workflows.validate(
      identity,
      workspaceId,
      body,
    );
  }

  @Get("workflows/:id")
  get(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.workflows.get(identity, workspaceId, id);
  }

  @Patch("workflows/:id")
  update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.workflows.update(
      identity,
      workspaceId,
      id,
      parseBody(UpdateWorkflowSchema, body),
    );
  }

  @Post("workflows/:id/activate")
  activate(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.workflows.activate(identity, workspaceId, id);
  }

  @Post("workflows/:id/deactivate")
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.workflows.deactivate(identity, workspaceId, id);
  }

  @Get("workflow-executions")
  executions(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workflows.executions(identity, workspaceId);
  }

  @Get("workflows/:id/executions")
  workflowExecutions(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.workflows.executions(identity, workspaceId, id);
  }

  @Get("workflow-executions/:id")
  execution(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.workflows.execution(identity, workspaceId, id);
  }
}
