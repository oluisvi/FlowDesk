"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Network,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge, Button, EmptyState, Input } from "@flowdesk/ui";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { Workflow, WorkflowExecution } from "@/lib/types";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHead } from "@/components/page-head";
import { Sheet } from "@/components/sheet";

const starterDefinition = {
  nodes: [
    {
      id: "trigger-client-created",
      type: "trigger",
      kind: "CLIENT_CREATED",
      position: { x: 80, y: 160 },
      config: {},
    },
    {
      id: "action-create-project",
      type: "action",
      kind: "CREATE_PROJECT",
      position: { x: 390, y: 160 },
      config: {
        name: "Client Onboarding",
        status: "ACTIVE",
        priority: "MEDIUM",
      },
    },
  ],
  edges: [
    {
      id: "trigger-client-created-action-create-project",
      source: "trigger-client-created",
      target: "action-create-project",
    },
  ],
};

function StatusBadge({ status }: { status: Workflow["status"] }) {
  const label = status === "ACTIVE" ? "Ativo" : status === "INACTIVE" ? "Pausado" : "Rascunho";
  return (
    <Badge>
      <span className="status-dot" data-status={status} /> {label}
    </Badge>
  );
}

function ExecutionStatus({ status }: { status: WorkflowExecution["status"] }) {
  const success = status === "SUCCEEDED";
  const failed = status === "FAILED";
  return (
    <span className={`execution-status ${success ? "is-success" : failed ? "is-failed" : "is-running"}`}>
      {success ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
      {status === "SUCCEEDED" ? "Concluída" : status === "FAILED" ? "Falhou" : status === "RUNNING" ? "Executando" : "Pendente"}
    </span>
  );
}

export function WorkflowsPage() {
  const { workspaceId } = useSession();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Client onboarding");

  const workflows = useQuery({
    queryKey: workspaceId ? qk.workflows(workspaceId) : ["workflows", "none"],
    queryFn: () => api.get<Workflow[]>(`/workspaces/${workspaceId}/workflows`),
    enabled: Boolean(workspaceId),
  });
  const executions = useQuery({
    queryKey: workspaceId ? qk.executions(workspaceId) : ["executions", "none"],
    queryFn: () => api.get<WorkflowExecution[]>(`/workspaces/${workspaceId}/workflow-executions`),
    enabled: Boolean(workspaceId),
    refetchInterval: 5_000,
  });
  const create = useMutation({
    mutationFn: () =>
      api.post<Workflow>(`/workspaces/${workspaceId}/workflows`, {
        name: name.trim(),
        description: "Fluxo operacional criado no FlowDesk.",
        definition: starterDefinition,
      }),
    onSuccess: async () => {
      setCreating(false);
      await qc.invalidateQueries({ queryKey: qk.workflows(workspaceId!) });
    },
  });

  if (!workspaceId || workflows.isLoading) return <LoadingPanel label="Carregando workflows…" />;
  if (workflows.error) return <EmptyState icon={<Network size={22} />} title="Não foi possível carregar os workflows" description={workflows.error.message} action={<Button variant="secondary" onClick={() => void workflows.refetch()}>Tentar novamente</Button>} />;
  const items = workflows.data ?? [];
  const recent = executions.data?.slice(0, 8) ?? [];

  return (
    <>
      <PageHead
        eyebrow="Automation studio"
        title="Workflows"
        description="Desenhe processos que reagem a eventos reais da operação. Cada ativação congela uma versão auditável e cada execução deixa rastros."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={14} /> Novo workflow
          </Button>
        }
      />

      <div className="automation-hero">
        <div>
          <span className="section-kicker"><Sparkles size={13} /> Flow engine</span>
          <h2>Transforme uma regra operacional em um fluxo executável.</h2>
          <p>
            Gatilhos escutam o domínio, condições restringem o caminho e ações reutilizam os mesmos serviços protegidos por tenant do restante do produto.
          </p>
        </div>
        <div className="automation-hero__rail" aria-hidden="true">
          <span><Network size={14} /> Trigger</span><i /><span><Activity size={14} /> Condition</span><i /><span><Zap size={14} /> Action</span>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Network size={22} />}
          title="Nenhum workflow ainda"
          description="Comece por um fluxo simples. O editor valida estrutura, configuração e ciclos antes de permitir ativação."
          action={<Button onClick={() => setCreating(true)}><Plus size={14} /> Criar primeiro workflow</Button>}
        />
      ) : (
        <div className="workflow-grid">
          {items.map((workflow) => (
            <Link href={`/app/workflows/${workflow.id}`} className="workflow-card" key={workflow.id}>
              <div className="workflow-card__top">
                <div className="workflow-card__icon"><Network size={17} /></div>
                <StatusBadge status={workflow.status} />
              </div>
              <h3>{workflow.name}</h3>
              <p>{workflow.description || "Automação operacional sem descrição."}</p>
              <div className="workflow-card__stats">
                <span><strong>{workflow._count?.executions ?? 0}</strong> execuções</span>
                <span><strong>{workflow._count?.versions ?? 0}</strong> versões</span>
              </div>
              <div className="workflow-card__foot">
                <span>Atualizado {new Date(workflow.updatedAt).toLocaleDateString("pt-BR")}</span>
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="section-block">
        <div className="section-block__head"><div><span className="section-kicker">Observabilidade</span><h2>Execuções recentes</h2></div></div>
        <div className="data-panel">
          {recent.length === 0 ? (
            <EmptyState icon={<Activity size={20} />} title="Nenhuma execução registrada" description="Quando um workflow ativo reagir a um evento, a linha completa da execução aparecerá aqui." />
          ) : recent.map((execution) => (
            <Link key={execution.id} href={`/app/workflows/executions/${execution.id}`} className="execution-row">
              <span><strong>{execution.workflow?.name ?? "Workflow"}</strong><small>#{execution.id.slice(0, 8)}</small></span>
              <ExecutionStatus status={execution.status} />
              <span>v{execution.workflowVersion?.version ?? "–"}</span>
              <span>{new Date(execution.createdAt).toLocaleString("pt-BR")}</span>
              <ArrowRight size={13} />
            </Link>
          ))}
        </div>
      </section>

      {creating ? (
        <Sheet
          title="Novo workflow"
          subtitle="Comece com um esqueleto Trigger → Action e refine no canvas visual."
          onClose={() => setCreating(false)}
        >
          <div className="sheet-form">
            <p className="sheet-copy">
              Nada é ativado sem validação explícita. A versão publicada é
              imutável e cada execução mantém seu próprio trace.
            </p>
            <div className="field">
              <label htmlFor="workflow-name">
                <span className="field-label__text">Nome do workflow</span>
                <Input
                  id="workflow-name"
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            </div>
            <div className="sheet-preview-flow" aria-label="Fluxo inicial: Cliente criado para Criar projeto">
              <span>Cliente criado</span><i aria-hidden="true" /><span>Criar projeto</span>
            </div>
            {create.error ? <p className="form-error">{create.error.message}</p> : null}
            <div className="sheet-actions">
              <Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Criando…" : "Criar e editar"}
              </Button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
