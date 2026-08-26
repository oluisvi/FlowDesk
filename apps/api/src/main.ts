import "reflect-metadata";
import { loadEnvironment } from "@flowdesk/config";
import { createApp } from "./app.factory";

async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.listen(loadEnvironment().apiPort);
}

void bootstrap();
