import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["test/**/*.integration-spec.ts"],
  },
  resolve: {
    alias: {
      "@flowdesk/config": resolve(__dirname, "../../packages/config/src"),
      "@flowdesk/shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
