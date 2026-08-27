import type { WorkflowNode } from "@flowdesk/shared";

const priorityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 } as const;

function normalize(value: unknown): unknown {
  if (typeof value === "string" && value in priorityRank) {
    return priorityRank[value as keyof typeof priorityRank];
  }
  return value;
}

export function evaluateCondition(
  node: Extract<WorkflowNode, { type: "condition" }>,
  payload: Record<string, unknown>,
): boolean {
  const actual = payload[node.config.field];
  const expected = node.config.value;
  const left = normalize(actual);
  const right = normalize(expected);

  switch (node.config.operator) {
    case "EQ":
      return left === right;
    case "NEQ":
      return left !== right;
    case "GTE":
      return typeof left === "number" && typeof right === "number" && left >= right;
    case "LTE":
      return typeof left === "number" && typeof right === "number" && left <= right;
    case "IN":
      return Array.isArray(expected) && expected.map(String).includes(String(actual));
  }
}
