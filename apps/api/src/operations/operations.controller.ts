import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CreateClientSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
} from "@flowdesk/shared";
import { AccessGuard } from "../auth/access.guard";
import { CurrentIdentity } from "../auth/current-identity.decorator";
import type { RequestIdentity } from "../authorization/request-identity";
import { parseBody } from "../common/validation";
import { OperationsService } from "./operations.service";

@Controller("workspaces/:workspaceId")
@UseGuards(AccessGuard)
export class OperationsController {
  constructor(
    @Inject(OperationsService) private readonly operations: OperationsService,
  ) {}

  @Post("clients")
  createClient(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.operations.createClient(
      identity,
      workspaceId,
      parseBody(CreateClientSchema, body),
    );
  }

  @Get("clients/:clientId")
  getClient(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("clientId") clientId: string,
  ) {
    return this.operations.getClient(identity, workspaceId, clientId);
  }

  @Post("projects")
  createProject(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.operations.createProject(
      identity,
      workspaceId,
      parseBody(CreateProjectSchema, body),
    );
  }

  @Post("tasks")
  createTask(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.operations.createTask(
      identity,
      workspaceId,
      parseBody(CreateTaskSchema, body),
    );
  }

  @Patch("tasks/:taskId")
  updateTask(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @Body() body: unknown,
  ) {
    return this.operations.updateTask(
      identity,
      workspaceId,
      taskId,
      parseBody(UpdateTaskSchema, body),
    );
  }

  @Get("activity")
  activity(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query("entityId") entityId?: string,
  ) {
    return this.operations.listActivity(identity, workspaceId, entityId);
  }
}
