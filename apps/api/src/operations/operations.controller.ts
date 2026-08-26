import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CreateClientSchema,
  ClientStatusSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  CreateTaskCommentSchema,
  UpdateTaskSchema,
  TaskStatusSchema,
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

  @Get("clients")
  listClients(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.operations.listClients(identity, workspaceId, {
      search: search?.trim() || undefined,
      status: status ? ClientStatusSchema.parse(status) : undefined,
    });
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

  @Get("tasks")
  listTasks(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query("status") status?: string,
  ) {
    return this.operations.listTasks(identity, workspaceId, {
      status: status ? TaskStatusSchema.parse(status) : undefined,
    });
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

  @Delete("tasks/:taskId")
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveTask(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
  ) {
    return this.operations.archiveTask(identity, workspaceId, taskId);
  }

  @Get("activity")
  activity(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query("entityId") entityId?: string,
  ) {
    return this.operations.listActivity(identity, workspaceId, entityId);
  }

  @Post("tasks/:taskId/comments")
  createComment(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @Body() body: unknown,
  ) {
    return this.operations.createComment(
      identity,
      workspaceId,
      taskId,
      parseBody(CreateTaskCommentSchema, body).content,
    );
  }

  @Get("tasks/:taskId/comments")
  comments(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
  ) {
    return this.operations.listComments(identity, workspaceId, taskId);
  }

  @Patch("notifications/:notificationId/read")
  markNotificationRead(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("notificationId") notificationId: string,
  ) {
    return this.operations.markNotificationRead(
      identity,
      workspaceId,
      notificationId,
    );
  }

  @Get("dashboard")
  dashboard(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.operations.dashboard(identity, workspaceId);
  }
}
