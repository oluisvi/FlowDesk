"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Code2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@flowdesk/ui";
import { LoadingPanel } from "@/components/loading-panel";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { WorkflowExecution } from "@/lib/types";

export function ExecutionDetailPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useSession();
  const query = useQuery({
    queryKey: workspaceId ? qk.execution(workspaceId, params.id) : ["execution", "none"],
    queryFn: () => api.get<WorkflowExecution>(`/workspaces/${workspaceId}/workflow-executions/${params.id}`),
    enabled: Boolean(workspaceId && params.id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "RUNNING" ? 2_000 : false;
    },
  });
  if (!workspaceId || query.isLoading) return <LoadingPanel label="Lendo execução…" />;
  if (query.error) return <EmptyState title="Não foi possível ler a execução" description={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Tentar novamente</Button>} />;
  const execution = query.data;
  if (!execution) return <EmptyState title="Execução não encontrada" description="Ela pode ter sido removida ou pertencer a outro workspace." />;

  return (
    <>
      <div className="editor-head">
        <div>
          <Link href="/app/workflows" className="back-link"><ArrowLeft size={13} /> Workflows</Link>
          <div className="editor-title-row"><h1>Execução #{execution.id.slice(0, 8)}</h1><Badge>{execution.status}</Badge></div>
          <p>{execution.workflow?.name ?? "Workflow"} · depth {execution.depth} · evento {execution.triggerEventId.slice(0, 8)}</p>
        </div>
      </div>
      <div className="execution-summary-grid">
        <Card><span>Status</span><strong>{execution.status}</strong></Card>
        <Card><span>Versão</span><strong>v{execution.workflowVersion?.version ?? "–"}</strong></Card>
        <Card><span>Iniciada</span><strong>{execution.startedAt ? new Date(execution.startedAt).toLocaleTimeString("pt-BR") : "–"}</strong></Card>
        <Card><span>Finalizada</span><strong>{execution.finishedAt ? new Date(execution.finishedAt).toLocaleTimeString("pt-BR") : "–"}</strong></Card>
      </div>
      {execution.error && <div className="validation-banner"><AlertTriangle size={15} /><div><strong>Falha da execução</strong><div>{execution.error}</div></div></div>}
      <section className="section-block">
        <div className="section-block__head"><div><span className="section-kicker">Trace</span><h2>Etapas persistidas</h2></div></div>
        <div className="step-list">
          {(execution.steps ?? []).map((step) => (
            <div className="step" key={step.id}>
              <div className="step-index">{step.status === "SUCCEEDED" ? <CheckCircle2 size={13} /> : step.status === "FAILED" ? <AlertTriangle size={13} /> : <Clock3 size={13} />}</div>
              <div><strong>{step.nodeId}</strong><p>{step.nodeType} · tentativa {step.attempt}{step.error ? ` · ${step.error}` : ""}</p></div>
              <Badge>{step.status}</Badge>
              {(step.input || step.output) && <details className="step-payload"><summary><Code2 size={12} /> metadata segura</summary><pre>{JSON.stringify({ input: step.input, output: step.output }, null, 2)}</pre></details>}
            </div>
          ))}
          {(execution.steps?.length ?? 0) === 0 && <EmptyState title="Sem etapas persistidas" description="A execução ainda não iniciou ou não chegou a um nó processável." />}
        </div>
      </section>
    </>
  );
}
