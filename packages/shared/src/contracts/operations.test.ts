import { describe, expect, it } from "vitest";
import {
  CreateClientSchema,
  CreateProjectSchema,
  UpdateClientSchema,
  UpdateProjectSchema,
} from "./operations.js";

describe("operations contracts", () => {
  it("reserves archived client state for the archive lifecycle", () => {
    expect(CreateClientSchema.safeParse({ name: "Acme", status: "ARCHIVED" }).success).toBe(false);
    expect(UpdateClientSchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
  });

  it("reserves archived project state for the archive lifecycle", () => {
    expect(CreateProjectSchema.safeParse({ name: "Launch", status: "ARCHIVED" }).success).toBe(false);
    expect(UpdateProjectSchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
  });
});
