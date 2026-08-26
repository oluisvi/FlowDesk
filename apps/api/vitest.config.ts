import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@flowdesk/config": resolve(__dirname, "../../packages/config/src"),
      "@flowdesk/shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
