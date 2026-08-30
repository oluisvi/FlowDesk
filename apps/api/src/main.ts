import "reflect-metadata";
import { loadEnvironment } from "@flowdesk/config";
import { createApp } from "./app.factory.js";

async function bootstrap(): Promise<void> {
  process.env.FLOWDESK_PROCESS = "api";
  const port = Number(process.env.PORT ?? loadEnvironment().apiPort);
  const app = await createApp();
  await app.listen(port, "0.0.0.0");
  console.log(JSON.stringify({ type: "flowdesk_api_started", port }));
}

void bootstrap();
