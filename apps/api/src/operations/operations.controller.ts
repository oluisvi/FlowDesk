import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  AssignProjectMemberSchema,
  ClientListQuerySchema,
  CreateClientSchema,
  CreateProjectSchema,
  CreateTaskCommentSchema,
  CreateTaskSchema,
  ProjectListQuerySchema,
  TaskListQuerySchema,
  UpdateClientSchema,
  UpdateProjectSchema,
  UpdateTaskSchema,
} from "@flowdesk/shared";
import { AccessGuard } from "../auth/access.guard.js";
import { CurrentIdentity } from "../auth/current-identity.decorator.js";
import type { RequestIdentity } from "../authorization/request-identity.js";
import { parseBody } from "../common/validation.js";
import { OperationsService } from "./operations.service.js";

@Controller("workspaces/:workspaceId")
@UseGuards(AccessGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

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
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.operations.listClients(
      identity,
      workspaceId,
      parseBody(ClientListQuerySchema, query),
    );
  }

  @Get("clients/:id")
  getClient(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.getClient(identity, workspaceId, id);
  }

  @Patch("clients/:id")
  updateClient(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.operations.updateClient(
      identity,
      workspaceId,
      id,
      parseBody(UpdateClientSchema, body),
    );
  }

  @Delete("clients/:id")
  @HttpCode(204)
  archiveClient(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.archiveClient(identity, workspaceId, id);
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

  @Get("projects")
  listProjects(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.operations.listProjects(
      identity,
      workspaceId,
      parseBody(ProjectListQuerySchema, query),
    );
  }

  @Get("projects/:id")
  getProject(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.getProject(identity, workspaceId, id);
  }

  @Patch("projects/:id")
  updateProject(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.operations.updateProject(
      identity,
      workspaceId,
      id,
      parseBody(UpdateProjectSchema, body),
    );
  }

  @Delete("projects/:id")
  @HttpCode(204)
  archiveProject(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.archiveProject(identity, workspaceId, id);
  }

  @Post("projects/:projectId/members")
  assignProjectMember(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
  ) {
    return this.operations.assignProjectMember(
      identity,
      workspaceId,
      projectId,
      parseBody(AssignProjectMemberSchema, body).membershipId,
    );
  }

  @Get("projects/:projectId/members")
  listProjectMembers(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.operations.listProjectMembers(identity, workspaceId, projectId);
  }

  @Delete("projects/:projectId/members/:membershipId")
  @HttpCode(204)
  removeProjectMember(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Param("membershipId") membershipId: string,
  ) {
    return this.operations.removeProjectMember(
      identity,
      workspaceId,
      projectId,
      membershipId,
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
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.operations.listTasks(
      identity,
      workspaceId,
      parseBody(TaskListQuerySchema, query),
    );
  }

  @Get("tasks/:id")
  getTask(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.getTask(identity, workspaceId, id);
  }

  @Patch("tasks/:id")
  updateTask(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.operations.updateTask(
      identity,
      workspaceId,
      id,
      parseBody(UpdateTaskSchema, body),
    );
  }

  @Delete("tasks/:id")
  @HttpCode(204)
  archiveTask(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.archiveTask(identity, workspaceId, id);
  }

  @Post("tasks/:id/comments")
  createComment(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.operations.createComment(
      identity,
      workspaceId,
      id,
      parseBody(CreateTaskCommentSchema, body).content,
    );
  }

  @Get("tasks/:id/comments")
  listComments(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.listComments(identity, workspaceId, id);
  }

  @Get("activity")
  activity(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query("entityId") entityId?: string,
  ) {
    return this.operations.listActivity(identity, workspaceId, entityId);
  }

  @Get("notifications")
  notifications(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Query("unread") unread?: string,
  ) {
    return this.operations.listNotifications(
      identity,
      workspaceId,
      unread === undefined ? undefined : unread === "true",
    );
  }

  @Patch("notifications/:id/read")
  markNotificationRead(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.operations.markNotificationRead(identity, workspaceId, id);
  }

  @Patch("notifications/read-all")
  @HttpCode(204)
  markAllNotificationsRead(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.operations.markAllNotificationsRead(identity, workspaceId);
  }

  @Get("dashboard")
  dashboard(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.operations.dashboard(identity, workspaceId);
  }
}
