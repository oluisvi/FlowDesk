import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health";

describe("HealthResponseSchema", () => {
  it("accepts the API health contract", () => {
    expect(
      HealthResponseSchema.parse({ status: "ok", service: "api" }),
    ).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("rejects a response without the API service", () => {
    expect(HealthResponseSchema.safeParse({ status: "ok" }).success).toBe(
      false,
    );
  });
});
