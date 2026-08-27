import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const FLOWDESK_EVENT_QUEUE = "flowdesk-events";

@Injectable()
export class QueueInfrastructureService implements OnModuleDestroy {
  readonly connection: Redis;
  readonly queue: Queue;

  constructor() {
    this.connection = new Redis(
      process.env.REDIS_URL ?? "redis://localhost:6379",
      {
        // API/outbox publishing should fail quickly when Redis is unavailable;
        // the durable outbox will retry later. Worker connections use
        // maxRetriesPerRequest=null separately so consumers can recover.
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableReadyCheck: true,
        enableOfflineQueue: false,
      },
    );
    this.queue = new Queue(FLOWDESK_EVENT_QUEUE, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: 500,
        removeOnFail: 1_000,
      },
    });
  }

  async enqueueEvent(eventId: string): Promise<void> {
    if (this.connection.status === "wait") await this.connection.connect();
    await this.queue.add("domain-event", { eventId }, { jobId: eventId });
  }

  async healthy(): Promise<boolean> {
    try {
      if (this.connection.status === "wait") await this.connection.connect();
      return (await this.connection.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit().catch(() => undefined);
  }
}
