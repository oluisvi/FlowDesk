"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, Filter, UserRound, Wrench } from "lucide-react";
import { Badge, Button, EmptyState, Select } from "@flowdesk/ui";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHead } from "@/components/page-head";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { ActivityItem } from "@/lib/types";

const actionLabels: Record<string, string> = {
  "workspace.created": "Workspace criado",
  "member.joined": "Membro entrou no workspace",
  "client.created": "Cliente criado",
  "client.updated": "Cliente atualizado",
  "client.status_changed": "Status do cliente alterado",
  "project.created": "Projeto criado",
  "project.updated": "Projeto atualizado",
  "project.status_changed": "Status do projeto alterado",
  "task.created": "Tarefa criada",
  "task.updated": "Tarefa atualizada",
  "task.status_changed": "Status da tarefa alterado",
  "task.comment_added": "Comentário adicionado",
  "client.archived": "Cliente arquivado",
  "project.archived": "Projeto arquivado",
  "project.member_assigned": "Membro adicionado ao projeto",
  "project.member_removed": "Membro removido do projeto",
  "task.archived": "Tarefa arquivada",
  "workflow.deactivated": "Workflow pausado",
  "workflow.activated": "Workflow ativado",
  "workflow.execution_succeeded": "Workflow executado",
  "workflow.execution_failed": "Workflow falhou",
};

function ActorIcon({ type }: { type: ActivityItem["actorType"] }) {
  return type === "USER" ? (
    <UserRound size={14} />
  ) : type === "AUTOMATION" ? (
    <Bot size={14} />
  ) : (
    <Wrench size={14} />
  );
}

export function ActivityPage() {
  const { workspaceId } = useSession();
  const [actor, setActor] = useState("ALL");
  const query = useQuery({
    queryKey: workspaceId ? qk.activity(workspaceId) : ["activity", "none"],
    queryFn: () =>
      api.get<ActivityItem[]>(`/workspaces/${workspaceId}/activity`),
    enabled: Boolean(workspaceId),
    refetchInterval: 20_000,
  });
  const rows = useMemo(
    () =>
      (query.data ?? []).filter(
        (item) => actor === "ALL" || item.actorType === actor,
      ),
    [actor, query.data],
  );

  if (!workspaceId || query.isLoading)
    return <LoadingPanel label="Reconstruindo linha do tempo…" />;
  if (query.error)
    return (
      <EmptyState
        icon={<Activity size={21} />}
        title="Não foi possível carregar a atividade"
        description={query.error.message}
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  return (
    <>
      <PageHead
        eyebrow="Operational history"
        title="Atividade"
        description="Uma linha do tempo única para mudanças humanas, automações e eventos de sistema — sem misturar histórico de produto com logs internos."
      />
      <div className="toolbar-row">
        <div className="toolbar-hint">
          <Filter size={13} /> Filtrar ator
        </div>
        <Select
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          aria-label="Filtrar atividade por ator"
        >
          <option value="ALL">Todos</option>
          <option value="USER">Pessoas</option>
          <option value="AUTOMATION">Automações</option>
          <option value="SYSTEM">Sistema</option>
        </Select>
      </div>
      <div className="timeline-panel">
        {rows.map((item) => (
          <article className="timeline-item" key={item.id}>
            <div className="timeline-dot" data-actor={item.actorType}>
              <ActorIcon type={item.actorType} />
            </div>
            <div className="timeline-copy">
              <div>
                <strong>{actionLabels[item.action] ?? item.action}</strong>
                <Badge>{item.entityType}</Badge>
              </div>
              <p>
                Recurso <code>{item.entityId.slice(0, 8)}</code>
                {typeof item.metadata?.name === "string"
                  ? ` · ${item.metadata.name}`
                  : ""}
              </p>
              <time>{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
            </div>
          </article>
        ))}
        {rows.length === 0 && (
          <EmptyState
            icon={<Activity size={21} />}
            title="Nada neste filtro"
            description="Atividades operacionais vão aparecer aqui conforme a equipe e os workflows trabalham."
          />
        )}
      </div>
    </>
  );
}
