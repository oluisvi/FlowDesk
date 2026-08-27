import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { AppModule } from "../app.module.js";
import { FLOWDESK_EVENT_QUEUE } from "../outbox/queue-infrastructure.service.js";
import { WorkflowEngineService } from "../workflows/workflow-engine.service.js";

async function bootstrap(): Promise<void> {
  process.env.FLOWDESK_PROCESS = "worker";
  const logger = new Logger("FlowDeskWorker");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  const engine = app.get(WorkflowEngineService);
  const connection = new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    { maxRetriesPerRequest: null },
  );
  const worker = new Worker(
    FLOWDESK_EVENT_QUEUE,
    async (job) => {
      const data = job.data as { eventId?: unknown };
      if (typeof data.eventId !== "string")
        throw new Error("Invalid event job payload");
      await engine.processEvent(data.eventId);
    },
    { connection, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5) },
  );

  worker.on("completed", (job) => {
    logger.log(
      JSON.stringify({ type: "workflow_job_completed", jobId: job.id }),
    );
  });
  worker.on("failed", (job, error) => {
    logger.error(
      JSON.stringify({
        type: "workflow_job_failed",
        jobId: job?.id,
        message: error.message.slice(0, 1_000),
      }),
    );
  });

  const shutdown = async () => {
    await worker.close();
    await connection.quit();
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

void bootstrap();
