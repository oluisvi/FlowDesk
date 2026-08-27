"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Network } from "lucide-react";
import { Badge, Button, EmptyState } from "@flowdesk/ui";
import { LoadingPanel } from "@/components/loading-panel";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { Workflow } from "@/lib/types";

const WorkflowBuilder = dynamic(
  () => import("./workflow-builder").then((module) => module.WorkflowBuilder),
  { ssr: false, loading: () => <LoadingPanel label="Preparando canvas…" /> },
);

export function WorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useSession();
  const workflow = useQuery({
    queryKey: workspaceId ? qk.workflow(workspaceId, params.id) : ["workflow", "none"],
    queryFn: () => api.get<Workflow>(`/workspaces/${workspaceId}/workflows/${params.id}`),
    enabled: Boolean(workspaceId && params.id),
  });

  if (!workspaceId || workflow.isLoading) return <LoadingPanel label="Abrindo workflow…" />;
  if (workflow.error) return <EmptyState icon={<Network size={22} />} title="Não foi possível abrir o workflow" description={workflow.error.message} action={<Button variant="secondary" onClick={() => void workflow.refetch()}>Tentar novamente</Button>} />;
  if (!workflow.data) return <EmptyState icon={<Network size={22} />} title="Workflow não encontrado" description="O fluxo pode ter sido removido ou pertencer a outro workspace." />;

  return (
    <>
      <div className="editor-head">
        <div>
          <Link href="/app/workflows" className="back-link"><ArrowLeft size={13} /> Workflows</Link>
          <div className="editor-title-row"><h1>{workflow.data.name}</h1><Badge>{workflow.data.status === "ACTIVE" ? `Ativo · v${workflow.data.activeVersion ?? 1}` : workflow.data.status === "INACTIVE" ? "Pausado" : "Rascunho"}</Badge></div>
          <p>{workflow.data.description || "Desenhe, valide e publique o fluxo operacional."}</p>
        </div>
      </div>
      <WorkflowBuilder workflow={workflow.data} workspaceId={workspaceId} />
    </>
  );
}
