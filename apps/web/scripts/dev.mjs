import { spawn } from "node:child_process";

const port = process.env.WEB_PORT || "3000";
const child = spawn("next", ["dev", "--port", port], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
