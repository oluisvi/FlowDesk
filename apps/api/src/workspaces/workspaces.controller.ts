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
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  AcceptInvitationSchema,
  CreateInvitationSchema,
  CreateWorkspaceSchema,
  UpdateMemberRoleSchema,
  UpdateWorkspaceSchema,
} from "@flowdesk/shared";
import { AccessGuard } from "../auth/access.guard.js";
import { CurrentIdentity } from "../auth/current-identity.decorator.js";
import type { RequestIdentity } from "../authorization/request-identity.js";
import { parseBody } from "../common/validation.js";
import { WorkspacesService } from "./workspaces.service.js";

@Controller()
@UseGuards(AccessGuard)
export class WorkspacesController {
  constructor(
    @Inject(WorkspacesService) private readonly workspaces: WorkspacesService,
  ) {}

  @Post("workspaces")
  async create(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() body: unknown,
  ) {
    const result = await this.workspaces.create(
      identity,
      parseBody(CreateWorkspaceSchema, body).name,
    );
    return { ...result.workspace, access: result.membership };
  }

  @Get("workspaces")
  list(@CurrentIdentity() identity: RequestIdentity) {
    return this.workspaces.list(identity);
  }

  @Post("workspaces/:workspaceId/switch")
  @HttpCode(HttpStatus.OK)
  switchWorkspace(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workspaces.switch(identity, workspaceId);
  }

  @Patch("workspaces/:workspaceId")
  update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.workspaces.update(
      identity,
      workspaceId,
      parseBody(UpdateWorkspaceSchema, body).name,
    );
  }

  @Post("workspaces/:workspaceId/invitations")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createInvitation(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.workspaces.createInvitation(
      identity,
      workspaceId,
      parseBody(CreateInvitationSchema, body),
    );
  }

  @Get("workspaces/:workspaceId/invitations")
  invitations(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workspaces.listInvitations(identity, workspaceId);
  }

  @Delete("workspaces/:workspaceId/invitations/:invitationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvitation(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
  ) {
    return this.workspaces.revokeInvitation(identity, workspaceId, invitationId);
  }

  @Post("invitations/accept")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  acceptInvitation(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() body: unknown,
  ) {
    return this.workspaces.acceptInvitation(
      identity,
      parseBody(AcceptInvitationSchema, body).token,
    );
  }

  @Get("workspaces/:workspaceId/members")
  members(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workspaces.listMembers(identity, workspaceId);
  }

  @Get("workspaces/:workspaceId/members/:membershipId")
  member(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
  ) {
    return this.workspaces.getMember(identity, workspaceId, membershipId);
  }

  @Patch("workspaces/:workspaceId/members/:membershipId")
  updateMember(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
  ) {
    return this.workspaces.updateMember(
      identity,
      workspaceId,
      membershipId,
      parseBody(UpdateMemberRoleSchema, body).role,
    );
  }

  @Delete("workspaces/:workspaceId/members/:membershipId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
  ) {
    return this.workspaces.removeMember(identity, workspaceId, membershipId);
  }

  @Post("workspaces/:workspaceId/leave")
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workspaces.leave(identity, workspaceId);
  }
}
