"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { Badge, Button, EmptyState } from "@flowdesk/ui";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHead } from "@/components/page-head";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { NotificationItem } from "@/lib/types";

export function NotificationsPage() {
  const { workspaceId } = useSession();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: workspaceId ? qk.notifications(workspaceId) : ["notifications", "none"],
    queryFn: () => api.get<NotificationItem[]>(`/workspaces/${workspaceId}/notifications`),
    enabled: Boolean(workspaceId),
    refetchInterval: 20_000,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/workspaces/${workspaceId}/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications(workspaceId!) }),
  });
  const markAll = useMutation({
    mutationFn: () => api.patch(`/workspaces/${workspaceId}/notifications/read-all`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications(workspaceId!) }),
  });
  if (!workspaceId || query.isLoading) return <LoadingPanel label="Buscando notificações…" />;
  if (query.error) return <EmptyState icon={<Bell size={21} />} title="Não foi possível carregar as notificações" description={query.error.message} action={<Button variant="secondary" onClick={() => void query.refetch()}>Tentar novamente</Button>} />;
  const items = query.data ?? [];
  const unread = items.filter((item) => !item.readAt).length;
  return (
    <>
      <PageHead
        eyebrow="Inbox operacional"
        title="Notificações"
        description="Alertas internos com contexto e destino seguro. O MVP mantém canais externos fora do core para preservar confiabilidade."
        action={<Button variant="secondary" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck size={14} /> Marcar tudo como lido</Button>}
      />
      <div className="notification-summary"><Bell size={17} /><strong>{unread}</strong><span>não lidas</span><i /><span>{items.length} no histórico recente</span></div>
      <div className="notification-list">
        {items.map((item) => {
          const content = <><div className="notification-icon" data-unread={!item.readAt}><Inbox size={15} /></div><div className="notification-copy"><div><strong>{item.title}</strong>{!item.readAt && <Badge>Nova</Badge>}</div><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString("pt-BR")}</time></div>{item.targetPath && <ExternalLink size={13} className="notification-link-icon" />}</>;
          return item.targetPath ? (
            <Link href={item.targetPath} className="notification-row" key={item.id} onClick={() => { if (!item.readAt) markRead.mutate(item.id); }}>{content}</Link>
          ) : (
            <button className="notification-row" key={item.id} onClick={() => { if (!item.readAt) markRead.mutate(item.id); }}>{content}</button>
          );
        })}
        {items.length === 0 && <EmptyState icon={<Bell size={21} />} title="Inbox zerada" description="Ações de automação e eventos importantes podem gerar notificações internas aqui." />}
      </div>
    </>
  );
}
