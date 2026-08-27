"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GitBranch, Network, Zap } from "lucide-react";

export interface FlowNodeData extends Record<string, unknown> {
  category: "trigger" | "condition" | "action";
  kind: string;
  label: string;
  config: Record<string, unknown>;
}

export type FlowNode = Node<FlowNodeData>;

export function FlowNodeView({ data, selected }: NodeProps<FlowNode>) {
  const Icon =
    data.category === "trigger"
      ? Network
      : data.category === "condition"
        ? GitBranch
        : Zap;
  return (
    <div
      className={`flow-node flow-node--${data.category}`}
      data-selected={selected}
      aria-label={`${data.category}: ${data.label}`}
    >
      {data.category !== "trigger" ? (
        <Handle
          type="target"
          position={Position.Left}
          className="flow-handle flow-handle--target"
        />
      ) : null}
      <div className="flow-node__head">
        <i />
        <Icon size={11} />
        <span>{data.category}</span>
      </div>
      <div className="flow-node__body">
        <strong>{data.label}</strong>
        <span>{describe(data)}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="flow-handle flow-handle--source"
      />
    </div>
  );
}

function describe(data: FlowNodeData) {
  if (data.category === "trigger") {
    if (data.kind === "STATUS_CHANGED" && data.config.toStatus) {
      return `Mudou para ${configText(data.config.toStatus)}`;
    }
    return "Evento do domínio";
  }
  if (data.category === "condition") {
    return `${configText(data.config.field, "campo")} ${configText(data.config.operator, "=")} ${Array.isArray(data.config.value) ? data.config.value.join(", ") : configText(data.config.value)}`;
  }
  if (data.kind === "CREATE_PROJECT")
    return configText(data.config.name, "Criar projeto");
  if (data.kind === "CREATE_TASK")
    return configText(data.config.title, "Criar tarefa");
  if (data.kind === "SEND_NOTIFICATION") {
    return configText(data.config.title, "Enviar notificação");
  }
  if (data.kind === "ASSIGN_MEMBER") return "Definir responsável";
  if (data.kind === "CHANGE_STATUS") {
    return `${configText(data.config.target, "item")} → ${configText(data.config.status, "status")}`;
  }
  return data.kind.replaceAll("_", " ").toLocaleLowerCase("pt-BR");
}

function configText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
