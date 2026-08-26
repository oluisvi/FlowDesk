import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export const API_VERSION_PREFIX = "api/v1";

const EnvironmentSchema = z.object({
  webPort: z.coerce.number().int().min(1).max(65_535).default(3000),
  apiPort: z.coerce.number().int().min(1).max(65_535).default(3001),
  databaseUrl: z
    .url()
    .default(
      "postgresql://flowdesk:flowdesk@localhost:5432/flowdesk?schema=public",
    ),
  redisUrl: z.url().default("redis://localhost:6379"),
});

export type AppEnvironment = z.infer<typeof EnvironmentSchema>;

export interface LoadEnvironmentOptions {
  rootDirectory?: string;
  processEnvironment?: NodeJS.ProcessEnv;
}

function findRepositoryRoot(startDirectory: string): string {
  let candidate = resolve(startDirectory);

  while (!existsSync(join(candidate, "pnpm-workspace.yaml"))) {
    const parent = dirname(candidate);
    if (parent === candidate) {
      throw new Error("Unable to locate the FlowDesk workspace root.");
    }
    candidate = parent;
  }

  return candidate;
}

export function loadEnvironment(
  options: LoadEnvironmentOptions = {},
): AppEnvironment {
  const rootDirectory =
    options.rootDirectory ?? findRepositoryRoot(process.cwd());
  const fileEnvironment: Record<string, string | undefined> = {};
  loadDotenv({
    path: join(rootDirectory, ".env"),
    processEnv: fileEnvironment,
    quiet: true,
  });
  const processEnvironment = options.processEnvironment ?? process.env;

  return EnvironmentSchema.parse({
    webPort: processEnvironment.WEB_PORT ?? fileEnvironment.WEB_PORT,
    apiPort: processEnvironment.API_PORT ?? fileEnvironment.API_PORT,
    databaseUrl:
      processEnvironment.DATABASE_URL ?? fileEnvironment.DATABASE_URL,
    redisUrl: processEnvironment.REDIS_URL ?? fileEnvironment.REDIS_URL,
  });
}
