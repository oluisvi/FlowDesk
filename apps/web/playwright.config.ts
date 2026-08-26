import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command: "pnpm exec next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
  },
});
