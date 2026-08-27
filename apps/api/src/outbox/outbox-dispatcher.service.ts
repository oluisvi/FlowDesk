import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service.js";
import { QueueInfrastructureService } from "./queue-infrastructure.service.js";

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueInfrastructureService,
  ) {}

  onModuleInit(): void {
    if (
      process.env.FLOWDESK_PROCESS === "worker" ||
      process.env.FLOWDESK_DISABLE_OUTBOX_DISPATCHER === "true"
    ) {
      return;
    }
    const interval = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1_500);
    this.timer = setInterval(() => void this.flush(), interval);
    this.timer.unref();
    void this.flush();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { processedAt: null, attempts: { lt: 10 } },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      for (const event of events) {
        try {
          await this.queue.enqueueEvent(event.id);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              processedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message.slice(0, 1_000) : "Queue publish failed";
          await this.prisma.outboxEvent
            .update({
              where: { id: event.id },
              data: { attempts: { increment: 1 }, lastError: message },
            })
            .catch(() => undefined);
          this.logger.warn(
            JSON.stringify({
              type: "outbox_publish_failed",
              eventId: event.id,
              message,
            }),
          );
          // Stop this batch. If Redis is unavailable, hammering every row only
          // increases load; the next poll will retry with durable state intact.
          break;
        }
      }
    } finally {
      this.running = false;
    }
  }
}
