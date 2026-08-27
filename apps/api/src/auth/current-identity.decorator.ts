import { createParamDecorator,type ExecutionContext } from "@nestjs/common"; import type { Request } from "express"; import type { RequestIdentity } from "../authorization/request-identity.js";
export const CurrentIdentity=createParamDecorator((_data:unknown,ctx:ExecutionContext)=>{const request=ctx.switchToHttp().getRequest<Request & {identity?:RequestIdentity}>();return request.identity;});
