import { describe, expect, it } from "vitest";
import { validateWorkflow } from "./workflow-validator.js";

const trigger = (id: string) => ({
  id,
  type: "trigger" as const,
  kind: "CLIENT_CREATED" as const,
  position: { x: 0, y: 0 },
  config: {},
});

const action = (id: string) => ({
  id,
  type: "action" as const,
  kind: "CREATE_TASK" as const,
  position: { x: 0, y: 0 },
  config: { title: "Task" },
});

const condition = (id: string) => ({
  id,
  type: "condition" as const,
  kind: "FIELD_COMPARE" as const,
  position: { x: 0, y: 0 },
  config: { field: "priority" as const, operator: "EQ" as const, value: "HIGH" },
});

describe("workflow validation", () => {
  it("rejects cycles", () => {
    const definition = {
      nodes: [trigger("t"), action("a")],
      edges: [
        { id: "1", source: "t", target: "a" },
        { id: "2", source: "a", target: "t" },
      ],
    };
    expect(
      validateWorkflow(definition).issues.some(
        (issue) => issue.code === "WORKFLOW_CYCLE",
      ),
    ).toBe(true);
  });

  it("rejects ambiguous multi-parent joins in V1", () => {
    const definition = {
      nodes: [trigger("t"), condition("c"), action("a")],
      edges: [
        { id: "1", source: "t", target: "c" },
        { id: "2", source: "t", target: "a" },
        { id: "3", source: "c", target: "a" },
      ],
    };
    expect(
      validateWorkflow(definition).issues,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "WORKFLOW_MULTI_PARENT", nodeId: "a" }),
      ]),
    );
  });


  it("rejects ordered comparisons for non-ordered fields", () => {
    const definition = {
      nodes: [
        trigger("t"),
        {
          id: "c",
          type: "condition" as const,
          kind: "FIELD_COMPARE" as const,
          position: { x: 120, y: 0 },
          config: { field: "status" as const, operator: "GTE" as const, value: "ACTIVE" },
        },
        action("a"),
      ],
      edges: [
        { id: "1", source: "t", target: "c" },
        { id: "2", source: "c", target: "a" },
      ],
    };
    expect(validateWorkflow(definition).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "WORKFLOW_CONDITION_OPERATOR", nodeId: "c" }),
      ]),
    );
  });

  it("requires IN conditions to use a list value", () => {
    const definition = {
      nodes: [
        trigger("t"),
        {
          id: "c",
          type: "condition" as const,
          kind: "FIELD_COMPARE" as const,
          position: { x: 120, y: 0 },
          config: { field: "status" as const, operator: "IN" as const, value: "ACTIVE" },
        },
        action("a"),
      ],
      edges: [
        { id: "1", source: "t", target: "c" },
        { id: "2", source: "c", target: "a" },
      ],
    };
    expect(validateWorkflow(definition).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "WORKFLOW_CONDITION_VALUE", nodeId: "c" }),
      ]),
    );
  });

  it("validates priority values used in conditions", () => {
    const definition = {
      nodes: [
        trigger("t"),
        {
          id: "c",
          type: "condition" as const,
          kind: "FIELD_COMPARE" as const,
          position: { x: 120, y: 0 },
          config: { field: "priority" as const, operator: "GTE" as const, value: "CRITICAL" },
        },
        action("a"),
      ],
      edges: [
        { id: "1", source: "t", target: "c" },
        { id: "2", source: "c", target: "a" },
      ],
    };
    expect(validateWorkflow(definition).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "WORKFLOW_CONDITION_VALUE", nodeId: "c" }),
      ]),
    );
  });

  it("rejects a status-change trigger with a status from another entity", () => {
    const definition = {
      nodes: [
        {
          id: "t",
          type: "trigger" as const,
          kind: "STATUS_CHANGED" as const,
          position: { x: 0, y: 0 },
          config: { entity: "CLIENT" as const, toStatus: "DONE" },
        },
        action("a"),
      ],
      edges: [{ id: "1", source: "t", target: "a" }],
    };

    expect(validateWorkflow(definition).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "WORKFLOW_TRIGGER_STATUS",
          nodeId: "t",
        }),
      ]),
    );
  });

  it("accepts an entity-compatible status-change trigger", () => {
    const definition = {
      nodes: [
        {
          id: "t",
          type: "trigger" as const,
          kind: "STATUS_CHANGED" as const,
          position: { x: 0, y: 0 },
          config: { entity: "TASK" as const, toStatus: "DONE" },
        },
        action("a"),
      ],
      edges: [{ id: "1", source: "t", target: "a" }],
    };

    expect(validateWorkflow(definition).valid).toBe(true);
  });

  it("accepts a configured trigger/action chain", () => {
    const definition = {
      nodes: [trigger("t"), action("a")],
      edges: [{ id: "1", source: "t", target: "a" }],
    };
    expect(validateWorkflow(definition).valid).toBe(true);
  });
});
