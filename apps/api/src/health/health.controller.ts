import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import type { HealthResponse } from "@flowdesk/shared";
import { PrismaService } from "../common/prisma.service.js";
import { QueueInfrastructureService } from "../outbox/queue-infrastructure.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueInfrastructureService,
  ) {}

  @Get()
  async health(): Promise<HealthResponse> {
    return {
      status: "ok",
      service: "api",
      queue: (await this.queue.healthy()) ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready(): Promise<{
    status: "ready";
    database: "ok";
    queue: "ok";
    timestamp: string;
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      if (!(await this.queue.healthy())) throw new Error("redis unavailable");
      return {
        status: "ready",
        database: "ok",
        queue: "ok",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        code: "DEPENDENCY_UNAVAILABLE",
        message: "FlowDesk dependencies are not ready",
      });
    }
  }
}
