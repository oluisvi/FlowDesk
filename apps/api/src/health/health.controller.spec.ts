import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("reports liveness without treating a degraded queue as process death", async () => {
    const controller = new HealthController(
      { $queryRaw: vi.fn() } as never,
      { healthy: vi.fn().mockResolvedValue(false) } as never,
    );
    expect(await controller.health()).toMatchObject({
      status: "ok",
      service: "api",
      queue: "degraded",
    });
  });

  it("reports readiness only when PostgreSQL and Redis answer", async () => {
    const controller = new HealthController(
      { $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]) } as never,
      { healthy: vi.fn().mockResolvedValue(true) } as never,
    );
    await expect(controller.ready()).resolves.toMatchObject({
      status: "ready",
      database: "ok",
      queue: "ok",
    });
  });

  it("fails readiness when a dependency is unavailable", async () => {
    const controller = new HealthController(
      { $queryRaw: vi.fn().mockRejectedValue(new Error("db down")) } as never,
      { healthy: vi.fn().mockResolvedValue(true) } as never,
    );
    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
