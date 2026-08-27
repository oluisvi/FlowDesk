import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health.js";

describe("health contract", () => {
  it("accepts the API liveness contract", () => {
    expect(
      HealthResponseSchema.parse({ status: "ok", service: "api" }),
    ).toEqual({ status: "ok", service: "api" });
  });

  it("accepts readiness metadata without weakening the base contract", () => {
    expect(
      HealthResponseSchema.parse({
        status: "ok",
        service: "api",
        queue: "ok",
        timestamp: "2026-08-27T00:00:00.000Z",
      }).queue,
    ).toBe("ok");
  });
});
