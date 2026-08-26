import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestIdentity } from "../authorization/request-identity";
import type { AuthenticatedRequest } from "./access.guard";

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestIdentity =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().identity,
);
