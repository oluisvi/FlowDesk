import { spawn } from "node:child_process";
import { loadEnvironment } from "@flowdesk/config";

const { webPort } = loadEnvironment();
const nextCli = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextCli, "dev", "-p", String(webPort)], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
