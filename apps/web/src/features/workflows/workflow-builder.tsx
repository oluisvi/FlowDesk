"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudCog,
  Info,
  MousePointer2,
  Pause,
  Play,
  Save,
  Trash2,
} from "lucide-react";
import {
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
} from "@flowdesk/shared";
import { Badge, Button, Input, Select, Textarea } from "@flowdesk/ui";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Client, Member, Project, Workflow } from "@/lib/types";
import { FlowNodeView, type FlowNode, type FlowNodeData } from "./flow-node";

const nodeTypes = { flow: FlowNodeView };

const labels: Record<string, string> = {
  CLIENT_CREATED: "Cliente criado",
  PROJECT_CREATED: "Projeto criado",
  TASK_COMPLETED: "Tarefa concluída",
  STATUS_CHANGED: "Status alterado",
  FIELD_COMPARE: "Comparar campo",
  CREATE_TASK: "Criar tarefa",
  CREATE_PROJECT: "Criar projeto",
  ASSIGN_MEMBER: "Atribuir membro",
  CHANGE_STATUS: "Alterar status",
  SEND_NOTIFICATION: "Enviar notificação",
};

const palette = [
  { category: "trigger", kind: "CLIENT_CREATED" },
  { category: "trigger", kind: "PROJECT_CREATED" },
  { category: "trigger", kind: "TASK_COMPLETED" },
  { category: "trigger", kind: "STATUS_CHANGED" },
  { category: "condition", kind: "FIELD_COMPARE" },
  { category: "action", kind: "CREATE_PROJECT" },
  { category: "action", kind: "CREATE_TASK" },
  { category: "action", kind: "ASSIGN_MEMBER" },
  { category: "action", kind: "CHANGE_STATUS" },
  { category: "action", kind: "SEND_NOTIFICATION" },
] as const satisfies ReadonlyArray<{
  category: FlowNodeData["category"];
  kind: string;
}>;

interface ValidationIssue {
  code: string;
  nodeId?: string;
  message: string;
}

function defaults(
  category: FlowNodeData["category"],
  kind: string,
): Record<string, unknown> {
  if (category === "condition") {
    return { field: "priority", operator: "EQ", value: "HIGH" };
  }
  if (kind === "CREATE_PROJECT") {
    return {
      name: "Client Onboarding",
      useEventClient: true,
      status: "ACTIVE",
      priority: "MEDIUM",
    };
  }
  if (kind === "CREATE_TASK") {
    return {
      title: "Schedule kickoff",
      status: "TODO",
      priority: "HIGH",
      usePreviousProject: true,
    };
  }
  if (kind === "ASSIGN_MEMBER") {
    return { membershipId: "", target: "previousTask" };
  }
  if (kind === "CHANGE_STATUS") {
    return { target: "task", status: "IN_PROGRESS" };
  }
  if (kind === "SEND_NOTIFICATION") {
    return {
      title: "FlowDesk update",
      message: "Uma automação executou uma nova ação.",
      targetPath: "/app/notifications",
    };
  }
  return {};
}

function fromDefinition(definition: unknown): {
  nodes: FlowNode[];
  edges: Edge[];
} {
  const parsed = WorkflowDefinitionSchema.safeParse(definition);
  if (!parsed.success) return { nodes: [], edges: [] };
  return {
    nodes: parsed.data.nodes.map((node) => ({
      id: node.id,
      type: "flow",
      position: node.position,
      data: {
        category: node.type,
        kind: node.kind,
        label: labels[node.kind] ?? node.kind,
        config: node.config,
      },
    })),
    edges: parsed.data.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      style: { stroke: "var(--accent)", strokeWidth: 1.6 },
    })),
  };
}

function toDefinition(nodes: FlowNode[], edges: Edge[]): WorkflowDefinition {
  return {
    nodes: nodes.map(
      (node) =>
        ({
          id: node.id,
          type: node.data.category,
          kind: node.data.kind,
          position: node.position,
          config: node.data.config,
        }) as WorkflowDefinition["nodes"][number],
    ),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

export function WorkflowBuilder({
  workflow,
  workspaceId,
}: {
  workflow: Workflow;
  workspaceId: string;
}) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner workflow={workflow} workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}

function WorkflowBuilderInner({
  workflow,
  workspaceId,
}: {
  workflow: Workflow;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const flow = useReactFlow<FlowNode>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(
    () => fromDefinition(workflow.draftDefinition),
    [workflow.draftDefinition],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    initial.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const members = useQuery({
    queryKey: qk.members(workspaceId),
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
  });
  const projects = useQuery({
    queryKey: qk.projects(workspaceId),
    queryFn: () => api.get<Project[]>(`/workspaces/${workspaceId}/projects`),
  });
  const clients = useQuery({
    queryKey: qk.clients(workspaceId),
    queryFn: () => api.get<Client[]>(`/workspaces/${workspaceId}/clients`),
  });

  const selected = nodes.find((node) => node.id === selectedId);
  const definition = useMemo(() => toDefinition(nodes, edges), [nodes, edges]);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
    setDirty(false);
    setIssues([]);
  }, [initial, setEdges, setNodes]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: qk.workflow(workspaceId, workflow.id),
      }),
      queryClient.invalidateQueries({ queryKey: qk.workflows(workspaceId) }),
    ]);
  };

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/workspaces/${workspaceId}/workflows/${workflow.id}`, {
        definition,
      }),
    onSuccess: async () => {
      setDirty(false);
      setNotice("Rascunho salvo");
      await invalidate();
    },
  });

  const validate = useMutation({
    mutationFn: () =>
      api.post<{ valid: boolean; issues: ValidationIssue[] }>(
        `/workspaces/${workspaceId}/workflows/validate`,
        definition,
      ),
    onSuccess: (result) => {
      setIssues(result.issues);
      setNotice(result.valid ? "Workflow válido para ativação" : null);
    },
  });

  const activate = useMutation({
    mutationFn: async () => {
      await api.patch(`/workspaces/${workspaceId}/workflows/${workflow.id}`, {
        definition,
      });
      return api.post(
        `/workspaces/${workspaceId}/workflows/${workflow.id}/activate`,
      );
    },
    onSuccess: async () => {
      setDirty(false);
      setIssues([]);
      setNotice("Nova versão publicada");
      await invalidate();
    },
    onError: () => void validate.mutate(),
  });

  const deactivate = useMutation({
    mutationFn: () =>
      api.post(
        `/workspaces/${workspaceId}/workflows/${workflow.id}/deactivate`,
      ),
    onSuccess: async () => {
      setNotice("Workflow pausado");
      await invalidate();
    },
  });

  const mutationError =
    save.error ?? validate.error ?? activate.error ?? deactivate.error;

  const runMutation = (
    kind: "validate" | "save" | "activate" | "deactivate",
  ) => {
    setNotice(null);
    save.reset();
    validate.reset();
    activate.reset();
    deactivate.reset();
    if (kind === "validate") validate.mutate();
    else if (kind === "save") save.mutate();
    else if (kind === "activate") activate.mutate();
    else deactivate.mutate();
  };

  const connect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--accent)", strokeWidth: 1.6 },
          },
          current,
        ),
      );
      setDirty(true);
    },
    [setEdges],
  );

  const addNode = useCallback(
    (
      category: FlowNodeData["category"],
      kind: string,
      position?: { x: number; y: number },
    ) => {
      const id = `${category}-${kind.toLocaleLowerCase()}-${Date.now().toString(36)}`;
      const index = nodes.length;
      setNodes((current) => [
        ...current,
        {
          id,
          type: "flow",
          position: position ?? {
            x: 80 + (index % 4) * 250,
            y: 100 + Math.floor(index / 4) * 170,
          },
          data: {
            category,
            kind,
            label: labels[kind] ?? kind,
            config: defaults(category, kind),
          },
        },
      ]);
      setSelectedId(id);
      setDirty(true);
    },
    [nodes.length, setNodes],
  );

  const updateConfig = (key: string, value: unknown) => {
    if (!selected) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selected.id
          ? {
              ...node,
              data: {
                ...node.data,
                config: { ...node.data.config, [key]: value },
              },
            }
          : node,
      ),
    );
    setIssues((current) =>
      current.filter((issue) => issue.nodeId !== selected.id),
    );
    setDirty(true);
  };

  const removeSelected = () => {
    if (!selected) return;
    setNodes((current) => current.filter((node) => node.id !== selected.id));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== selected.id && edge.target !== selected.id,
      ),
    );
    setSelectedId(null);
    setDirty(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const value = event.dataTransfer.getData("application/flowdesk");
    if (!value) return;
    try {
      const item = JSON.parse(value) as {
        category: FlowNodeData["category"];
        kind: string;
      };
      const position = flow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(item.category, item.kind, position);
    } catch {
      // Ignore malformed external drag payloads.
    }
  };

  return (
    <>
      <div className="workflow-editor-actions">
        <div className="workflow-editor-state">
          {dirty ? (
            <Badge>Alterações não salvas</Badge>
          ) : (
            <Badge>
              <CheckCircle2 size={11} /> Sincronizado
            </Badge>
          )}
          {workflow.status === "ACTIVE" ? (
            <Badge>
              <span className="status-dot" data-status="ACTIVE" /> Ativo · v
              {workflow.activeVersion}
            </Badge>
          ) : workflow.status === "INACTIVE" ? (
            <Badge>
              <span className="status-dot" data-status="INACTIVE" /> Pausado
            </Badge>
          ) : null}
          {notice ? <span className="editor-notice">{notice}</span> : null}
        </div>
        <div className="workflow-editor-buttons">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runMutation("validate")}
            disabled={validate.isPending}
          >
            <CloudCog size={13} /> Validar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runMutation("save")}
            disabled={!dirty || save.isPending}
          >
            <Save size={13} /> Salvar
          </Button>
          {workflow.status === "ACTIVE" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runMutation("deactivate")}
              disabled={deactivate.isPending}
            >
              <Pause size={13} /> Pausar
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => runMutation("activate")}
            disabled={activate.isPending}
          >
            <Play size={13} />
            {workflow.status === "ACTIVE" ? "Publicar versão" : "Ativar"}
          </Button>
        </div>
      </div>

      {mutationError ? (
        <div className="validation-banner workflow-validation" role="alert">
          <AlertTriangle size={15} />
          <div>
            <strong>Não foi possível concluir a operação.</strong>
            <div>{mutationError.message}</div>
          </div>
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="validation-banner workflow-validation" role="alert">
          <AlertTriangle size={15} />
          <div>
            <strong>{issues.length} ponto(s) impedem a ativação.</strong>
            <div>
              {issues.slice(0, 5).map((issue) => (
                <button
                  type="button"
                  key={`${issue.code}-${issue.nodeId ?? issue.message}`}
                  onClick={() => issue.nodeId && setSelectedId(issue.nodeId)}
                >
                  {issue.nodeId
                    ? `${labels[nodes.find((node) => node.id === issue.nodeId)?.data.kind ?? ""] ?? issue.nodeId}: `
                    : ""}
                  {issue.message}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="workflow-layout">
        <aside className="node-palette" aria-label="Blocos de workflow">
          <div className="node-palette__intro">
            <h3>Blocos</h3>
            <p>Arraste para o canvas ou clique para adicionar.</p>
          </div>
          {(["trigger", "condition", "action"] as const).map((category) => (
            <div className="palette-group" key={category}>
              <span className="nav-label">
                {category === "trigger"
                  ? "Gatilhos"
                  : category === "condition"
                    ? "Condições"
                    : "Ações"}
              </span>
              {palette
                .filter((item) => item.category === category)
                .map((item) => (
                  <button
                    className="palette-item"
                    data-kind={category}
                    key={item.kind}
                    onClick={() => addNode(category, item.kind)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        "application/flowdesk",
                        JSON.stringify(item),
                      );
                    }}
                  >
                    <i />
                    <span>{labels[item.kind]}</span>
                  </button>
                ))}
            </div>
          ))}
        </aside>

        <div
          className="workflow-canvas"
          ref={canvasRef}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              if (changes.some((change) => change.type !== "select"))
                setDirty(true);
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              setDirty(true);
            }}
            onConnect={connect}
            onNodeClick={(_event, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.35}
            maxZoom={1.6}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="var(--border-strong)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              className="workflow-minimap"
              nodeColor={(node) =>
                node.data?.category === "trigger"
                  ? "var(--blue)"
                  : node.data?.category === "condition"
                    ? "var(--warning)"
                    : "var(--accent)"
              }
            />
            <Panel position="top-left" className="workflow-canvas-hint">
              <MousePointer2 size={12} /> Arraste · conecte · configure
            </Panel>
          </ReactFlow>
        </div>

        <aside className="inspector" aria-label="Configuração do bloco">
          {selected ? (
            <>
              <div className="inspector-head">
                <div>
                  <span className="nav-label">Inspector</span>
                  <h3>{selected.data.label}</h3>
                </div>
                <Badge>{selected.data.category}</Badge>
              </div>
              <Inspector
                node={selected}
                members={members.data ?? []}
                projects={projects.data ?? []}
                clients={clients.data ?? []}
                onChange={updateConfig}
              />
              <Button
                size="sm"
                variant="danger"
                className="inspector-delete"
                onClick={removeSelected}
              >
                <Trash2 size={13} /> Remover bloco
              </Button>
            </>
          ) : (
            <div className="inspector-empty">
              <div>
                <MousePointer2 size={22} />
                <strong>Selecione um bloco</strong>
                <p>
                  O inspector mostra somente a configuração relevante para o
                  item selecionado.
                </p>
                <div className="inspector-tip">
                  <Info size={13} /> Um workflow ativo sempre executa uma versão
                  imutável.
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function statusOptions(entity: string): string[] {
  if (entity === "CLIENT") return ["ACTIVE", "INACTIVE", "ARCHIVED"];
  if (entity === "PROJECT") {
    return ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
  }
  if (entity === "TASK") {
    return ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];
  }
  return [];
}

function configText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function Inspector({
  node,
  members,
  projects,
  clients,
  onChange,
}: {
  node: FlowNode;
  members: Member[];
  projects: Project[];
  clients: Client[];
  onChange: (key: string, value: unknown) => void;
}) {
  const config = node.data.config;

  if (node.data.category === "trigger") {
    if (node.data.kind === "STATUS_CHANGED") {
      return (
        <div className="inspector-section">
          <Field label="Entidade">
            <Select
              value={configText(config.entity)}
              onChange={(event) => {
                const nextEntity = event.target.value || undefined;
                onChange("entity", nextEntity);
                onChange("toStatus", undefined);
              }}
            >
              <option value="">Qualquer entidade</option>
              <option value="CLIENT">Cliente</option>
              <option value="PROJECT">Projeto</option>
              <option value="TASK">Tarefa</option>
            </Select>
          </Field>
          <Field label="Novo status (opcional)">
            {config.entity ? (
              <Select
                value={configText(config.toStatus)}
                onChange={(event) =>
                  onChange("toStatus", event.target.value || undefined)
                }
              >
                <option value="">Qualquer status</option>
                {statusOptions(configText(config.entity)).map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={configText(config.toStatus)}
                placeholder="Ex.: DONE"
                onChange={(event) =>
                  onChange("toStatus", event.target.value || undefined)
                }
              />
            )}
          </Field>
          <p className="inspector-help">
            Sem filtros, o gatilho reage a qualquer evento de mudança de status
            do workspace.
          </p>
        </div>
      );
    }
    return (
      <div className="inspector-section">
        <p className="inspector-help">
          Este gatilho corresponde a um evento real do domínio. Ele não executa
          código arbitrário e respeita o tenant do workflow.
        </p>
      </div>
    );
  }

  if (node.data.category === "condition") {
    const listValue = Array.isArray(config.value)
      ? config.value.join(", ")
      : configText(config.value);
    return (
      <div className="inspector-section">
        <Field label="Campo">
          <Select
            value={configText(config.field, "priority")}
            onChange={(event) => {
              const nextField = event.target.value;
              onChange("field", nextField);
              if (
                nextField !== "priority" &&
                (config.operator === "GTE" || config.operator === "LTE")
              ) {
                onChange("operator", "EQ");
              }
            }}
          >
            <option value="status">Status</option>
            <option value="priority">Prioridade</option>
            <option value="assigneeId">Responsável</option>
            <option value="clientId">Cliente</option>
            <option value="projectId">Projeto</option>
          </Select>
        </Field>
        <Field label="Operador">
          <Select
            value={configText(config.operator, "EQ")}
            onChange={(event) => onChange("operator", event.target.value)}
          >
            <option value="EQ">igual a</option>
            <option value="NEQ">diferente de</option>
            {configText(config.field, "priority") === "priority" ? (
              <>
                <option value="GTE">maior/igual</option>
                <option value="LTE">menor/igual</option>
              </>
            ) : null}
            <option value="IN">está em</option>
          </Select>
        </Field>
        <ConditionValueEditor
          field={configText(config.field, "priority")}
          operator={configText(config.operator, "EQ")}
          value={listValue}
          members={members}
          projects={projects}
          clients={clients}
          onChange={(value) => onChange("value", value)}
        />
      </div>
    );
  }

  if (node.data.kind === "CREATE_PROJECT") {
    return (
      <div className="inspector-section">
        <Field label="Nome do projeto">
          <Input
            value={configText(config.name)}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={Boolean(config.useEventClient ?? true)}
            onChange={(event) =>
              onChange("useEventClient", event.target.checked)
            }
          />
          Usar cliente do evento quando disponível
        </label>
        <Field label="Cliente fixo (opcional)">
          <Select
            value={configText(config.clientId)}
            onChange={(event) =>
              onChange("clientId", event.target.value || undefined)
            }
          >
            <option value="">Nenhum</option>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="field-grid compact">
          <Field label="Status">
            <Select
              value={configText(config.status, "PLANNED")}
              onChange={(event) => onChange("status", event.target.value)}
            >
              <option value="PLANNED">Planejado</option>
              <option value="ACTIVE">Ativo</option>
              <option value="ON_HOLD">Em espera</option>
              <option value="COMPLETED">Concluído</option>
            </Select>
          </Field>
          <PrioritySelect
            value={configText(config.priority, "MEDIUM")}
            onChange={(value) => onChange("priority", value)}
          />
        </div>
      </div>
    );
  }

  if (node.data.kind === "CREATE_TASK") {
    return (
      <div className="inspector-section">
        <Field label="Título">
          <Input
            value={configText(config.title)}
            onChange={(event) => onChange("title", event.target.value)}
          />
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={Boolean(config.usePreviousProject)}
            onChange={(event) =>
              onChange("usePreviousProject", event.target.checked)
            }
          />
          Usar projeto criado anteriormente
        </label>
        <Field label="Projeto fixo (opcional)">
          <Select
            value={configText(config.projectId)}
            onChange={(event) =>
              onChange("projectId", event.target.value || undefined)
            }
          >
            <option value="">Nenhum</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável inicial (opcional)">
          <MemberSelect
            members={members}
            value={configText(config.assigneeId)}
            onChange={(value) => onChange("assigneeId", value || undefined)}
          />
        </Field>
        <div className="field-grid compact">
          <Field label="Status">
            <Select
              value={configText(config.status, "TODO")}
              onChange={(event) => onChange("status", event.target.value)}
            >
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">A fazer</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="REVIEW">Revisão</option>
              <option value="DONE">Concluída</option>
            </Select>
          </Field>
          <PrioritySelect
            value={configText(config.priority, "MEDIUM")}
            onChange={(value) => onChange("priority", value)}
          />
        </div>
      </div>
    );
  }

  if (node.data.kind === "ASSIGN_MEMBER") {
    return (
      <div className="inspector-section">
        <Field label="Membro">
          <MemberSelect
            members={members}
            value={configText(config.membershipId)}
            onChange={(value) => onChange("membershipId", value)}
          />
        </Field>
        <Field label="Alvo">
          <Select
            value={configText(config.target, "previousTask")}
            onChange={(event) => onChange("target", event.target.value)}
          >
            <option value="previousTask">Tarefa criada anteriormente</option>
            <option value="previousProject">
              Projeto criado anteriormente
            </option>
            <option value="eventTask">Tarefa do evento</option>
            <option value="eventProject">Projeto do evento</option>
          </Select>
        </Field>
        <Field label="Projeto explícito (opcional)">
          <Select
            value={configText(config.projectId)}
            onChange={(event) =>
              onChange("projectId", event.target.value || undefined)
            }
          >
            <option value="">Resolver pelo fluxo</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    );
  }

  if (node.data.kind === "CHANGE_STATUS") {
    const target = configText(config.target, "task") as
      "task" | "project" | "client";
    const statuses =
      target === "task"
        ? ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]
        : target === "project"
          ? ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"]
          : ["ACTIVE", "INACTIVE"];
    return (
      <div className="inspector-section">
        <Field label="Entidade">
          <Select
            value={target}
            onChange={(event) => {
              const next = event.target.value as "task" | "project" | "client";
              onChange("target", next);
              onChange(
                "status",
                next === "task"
                  ? "IN_PROGRESS"
                  : next === "project"
                    ? "ACTIVE"
                    : "ACTIVE",
              );
            }}
          >
            <option value="task">Tarefa relacionada ao evento</option>
            <option value="project">Projeto relacionado ao evento</option>
            <option value="client">Cliente relacionado ao evento</option>
          </Select>
        </Field>
        <Field label="Novo status">
          <Select
            value={configText(config.status, statuses[0])}
            onChange={(event) => onChange("status", event.target.value)}
          >
            {statuses.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    );
  }

  return (
    <div className="inspector-section">
      <Field label="Destinatário (opcional)">
        <MemberSelect
          members={members}
          value={configText(config.membershipId)}
          onChange={(value) => onChange("membershipId", value || undefined)}
        />
      </Field>
      <Field label="Título">
        <Input
          value={configText(config.title)}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </Field>
      <Field label="Mensagem">
        <Textarea
          value={configText(config.message)}
          onChange={(event) => onChange("message", event.target.value)}
        />
      </Field>
      <Field label="Destino interno">
        <Input
          value={configText(config.targetPath)}
          placeholder="/app/notifications"
          onChange={(event) =>
            onChange("targetPath", event.target.value || undefined)
          }
        />
      </Field>
      <p className="inspector-help">
        Use templates como <code>{"{{event.name}}"}</code> para inserir valores
        do evento.
      </p>
    </div>
  );
}

function ConditionValueEditor({
  field,
  operator,
  value,
  members,
  projects,
  clients,
  onChange,
}: {
  field: string;
  operator: string;
  value: string;
  members: Member[];
  projects: Project[];
  clients: Client[];
  onChange: (value: unknown) => void;
}) {
  if (operator !== "IN" && field === "assigneeId") {
    return (
      <Field label="Membro esperado">
        <MemberSelect members={members} value={value} onChange={onChange} />
      </Field>
    );
  }
  if (operator !== "IN" && field === "clientId") {
    return (
      <Field label="Cliente esperado">
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecionar cliente</option>
          {clients.map((client) => (
            <option value={client.id} key={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (operator !== "IN" && field === "projectId") {
    return (
      <Field label="Projeto esperado">
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecionar projeto</option>
          {projects.map((project) => (
            <option value={project.id} key={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (operator !== "IN" && field === "priority") {
    return (
      <Field label="Prioridade esperada">
        <Select
          value={value || "HIGH"}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="URGENT">Urgente</option>
        </Select>
      </Field>
    );
  }
  return (
    <Field
      label={operator === "IN" ? "Valores (separados por vírgula)" : "Valor"}
    >
      <Input
        value={value}
        onChange={(event) =>
          onChange(
            operator === "IN"
              ? event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : event.target.value,
          )
        }
      />
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>
        <span className="field-label__text">{label}</span>
        {children}
      </label>
    </div>
  );
}

function MemberSelect({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Selecionar membro</option>
      {members.map((member) => (
        <option value={member.id} key={member.id}>
          {member.user.name} · {member.role}
        </option>
      ))}
    </Select>
  );
}

function PrioritySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Prioridade">
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="LOW">Baixa</option>
        <option value="MEDIUM">Média</option>
        <option value="HIGH">Alta</option>
        <option value="URGENT">Urgente</option>
      </Select>
    </Field>
  );
}
