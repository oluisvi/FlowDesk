import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEnvironment } from "./index";

describe("loadEnvironment", () => {
  it("loads repository-root values and preserves explicit process values", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "flowdesk-config-"));

    try {
      await writeFile(
        join(rootDirectory, ".env"),
        "WEB_PORT=4100\nAPI_PORT=4101\n",
      );

      expect(
        loadEnvironment({
          rootDirectory,
          processEnvironment: { API_PORT: "4200" },
        }),
      ).toMatchObject({ webPort: 4100, apiPort: 4200 });
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
