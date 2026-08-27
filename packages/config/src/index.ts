import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export const API_VERSION_PREFIX = "api/v1";
const EnvironmentSchema = z.object({
  webPort: z.coerce.number().int().min(1).max(65_535).default(3000),
  apiPort: z.coerce.number().int().min(1).max(65_535).default(3001),
  databaseUrl: z.string().min(1).default("postgresql://flowdesk:flowdesk@localhost:5432/flowdesk?schema=public"),
  redisUrl: z.string().url().default("redis://localhost:6379"),
  corsOrigin: z.string().default("http://localhost:3000"),
  workflowMaxDepth: z.coerce.number().int().min(1).max(20).default(5),
  workflowMaxActions: z.coerce.number().int().min(1).max(100).default(25),
  outboxPollIntervalMs: z.coerce.number().int().min(250).max(30_000).default(1500)
});
export type AppEnvironment = z.infer<typeof EnvironmentSchema>;
function findRepositoryRoot(startDirectory: string): string {
  let candidate = resolve(startDirectory);
  while (!existsSync(join(candidate, "pnpm-workspace.yaml"))) {
    const parent = dirname(candidate);
    if (parent === candidate) return process.cwd();
    candidate = parent;
  }
  return candidate;
}
export function loadEnvironment(rootDirectory = findRepositoryRoot(process.cwd())): AppEnvironment {
  const fileEnvironment: Record<string, string | undefined> = {};
  loadDotenv({ path: join(rootDirectory, ".env"), processEnv: fileEnvironment, quiet: true });
  const env = process.env;
  return EnvironmentSchema.parse({
    webPort: env.WEB_PORT ?? fileEnvironment.WEB_PORT,
    apiPort: env.API_PORT ?? fileEnvironment.API_PORT,
    databaseUrl: env.DATABASE_URL ?? fileEnvironment.DATABASE_URL,
    redisUrl: env.REDIS_URL ?? fileEnvironment.REDIS_URL,
    corsOrigin: env.CORS_ORIGIN ?? fileEnvironment.CORS_ORIGIN,
    workflowMaxDepth: env.WORKFLOW_MAX_DEPTH ?? fileEnvironment.WORKFLOW_MAX_DEPTH,
    workflowMaxActions: env.WORKFLOW_MAX_ACTIONS ?? fileEnvironment.WORKFLOW_MAX_ACTIONS,
    outboxPollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS ?? fileEnvironment.OUTBOX_POLL_INTERVAL_MS
  });
}
