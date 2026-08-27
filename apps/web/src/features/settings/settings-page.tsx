"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  KeyRound,
  Laptop2,
  LogOut,
  MailPlus,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Select } from "@flowdesk/ui";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHead } from "@/components/page-head";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { Member, WorkspaceRole } from "@/lib/types";

interface InvitationItem {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "OWNER">;
  expiresAt: string;
  createdAt: string;
}

interface SessionItem {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

const roleLabel: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

function deviceLabel(userAgent?: string | null) {
  if (!userAgent) return "Sessão sem identificação de dispositivo";
  if (/mobile|android|iphone/i.test(userAgent)) return "Dispositivo móvel";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Navegador";
}

export function SettingsPage() {
  const {
    workspaceId,
    workspaces,
    reloadWorkspaces,
  } = useSession();
  const qc = useQueryClient();
  const active = workspaces.find((item) => item.workspace.id === workspaceId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "OWNER">>("MEMBER");
  const [inviteToken, setInviteToken] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);

  useEffect(() => setName(active?.workspace.name ?? ""), [active?.workspace.name]);

  const members = useQuery({
    queryKey: workspaceId ? qk.members(workspaceId) : ["members", "none"],
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
  });

  const invitations = useQuery({
    queryKey: ["invitations", workspaceId],
    queryFn: () =>
      api.get<InvitationItem[]>(`/workspaces/${workspaceId}/invitations`),
    enabled: Boolean(workspaceId && (active?.role === "OWNER" || active?.role === "ADMIN")),
  });

  const sessions = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: () => api.get<SessionItem[]>("/auth/sessions"),
  });

  const rename = useMutation({
    mutationFn: () => api.patch(`/workspaces/${workspaceId}`, { name: name.trim() }),
    onSuccess: async () => {
      setWorkspaceMessage("Nome atualizado.");
      await reloadWorkspaces();
    },
  });

  const invite = useMutation({
    mutationFn: () =>
      api.post<{ token: string }>(`/workspaces/${workspaceId}/invitations`, {
        email: email.trim(),
        role,
      }),
    onSuccess: async (data) => {
      setInviteToken(data.token);
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["invitations", workspaceId] });
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/invitations/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["invitations", workspaceId] }),
  });

  const updateRole = useMutation({
    mutationFn: ({
      id,
      nextRole,
    }: {
      id: string;
      nextRole: Exclude<WorkspaceRole, "OWNER">;
    }) => api.patch(`/workspaces/${workspaceId}/members/${id}`, { role: nextRole }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.members(workspaceId!) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${workspaceId}/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.members(workspaceId!) }),
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth-sessions"] }),
  });

  const leave = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/leave`),
    onSuccess: async () => {
      await reloadWorkspaces();
    },
    onError: (error) => {
      setWorkspaceMessage(
        error instanceof Error ? error.message : "Não foi possível sair do workspace.",
      );
    },
  });

  const canManage = active?.role === "OWNER" || active?.role === "ADMIN";
  const activeSessions = useMemo(
    () => (sessions.data ?? []).filter((session) => !session.revokedAt),
    [sessions.data],
  );

  if (!workspaceId || members.isLoading) {
    return <LoadingPanel label="Abrindo configurações…" />;
  }

  return (
    <div className="page">
      <PageHead
        eyebrow="Workspace control"
        title="Configurações"
        description="Identidade, membros, convites e sessões protegidos pelo mesmo limite de autorização do workspace."
      />

      <div className="settings-grid">
        <section className="settings-panel settings-panel--accent">
          <div className="settings-panel__head">
            <div className="feature-icon"><ShieldCheck size={17} /></div>
            <div>
              <h2>Workspace</h2>
              <p>Identidade operacional e nível de acesso atual.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="workspace-settings-name">Nome</label>
            <Input
              id="workspace-settings-name"
              value={name}
              disabled={!canManage}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="settings-inline">
            <Badge>{roleLabel[active?.role ?? "VIEWER"]}</Badge>
            <span>slug · {active?.workspace.slug}</span>
          </div>
          {workspaceMessage ? <p className="settings-feedback">{workspaceMessage}</p> : null}
          <div className="settings-actions-row">
            {canManage ? (
              <Button
                size="sm"
                disabled={!name.trim() || rename.isPending}
                onClick={() => rename.mutate()}
              >
                <Save size={13} /> Salvar nome
              </Button>
            ) : null}
            {active?.role !== "OWNER" ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={leave.isPending}
                onClick={() => {
                  if (window.confirm("Sair deste workspace? Você perderá acesso aos dados dele.")) {
                    leave.mutate();
                  }
                }}
              >
                <LogOut size={13} /> Sair do workspace
              </Button>
            ) : null}
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel__head">
            <div className="feature-icon"><UserPlus size={17} /></div>
            <div>
              <h2>Convidar membro</h2>
              <p>Convites expiram, podem ser revogados e são vinculados ao e-mail.</p>
            </div>
          </div>
          {canManage ? (
            <>
              <div className="field">
                <label htmlFor="invite-email">E-mail</label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="pessoa@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="invite-role">Papel</label>
                <Select
                  id="invite-role"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as Exclude<WorkspaceRole, "OWNER">)
                  }
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </Select>
              </div>
              <Button
                size="sm"
                disabled={!email.trim() || invite.isPending}
                onClick={() => invite.mutate()}
              >
                <MailPlus size={13} /> Gerar convite
              </Button>
              {invite.error ? <p className="form-error">{invite.error.message}</p> : null}
              {inviteToken ? (
                <div className="invite-token">
                  <KeyRound size={14} />
                  <code>{inviteToken}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(inviteToken)}
                    aria-label="Copiar token"
                  >
                    <Copy size={13} />
                  </button>
                  <small>
                    No MVP, compartilhe este token com o convidado e abra <code>/invite</code>.
                    O token não é persistido em texto puro.
                  </small>
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted-copy">Seu papel não permite convidar ou administrar membros.</p>
          )}
        </section>
      </div>

      {canManage ? (
        <section className="section-block">
          <div className="section-block__head">
            <div>
              <span className="section-kicker">Acesso pendente</span>
              <h2>Convites ativos</h2>
            </div>
            <Badge>{invitations.data?.length ?? 0}</Badge>
          </div>
          <div className="invite-list">
            {(invitations.data ?? []).map((invitation) => (
              <article className="invite-row" key={invitation.id}>
                <div className="notification-icon"><MailPlus size={14} /></div>
                <div>
                  <strong>{invitation.email}</strong>
                  <span>
                    {roleLabel[invitation.role]} · expira {new Date(invitation.expiresAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revokeInvitation.isPending}
                  onClick={() => revokeInvitation.mutate(invitation.id)}
                >
                  Revogar
                </Button>
              </article>
            ))}
            {!invitations.isLoading && !invitations.data?.length ? (
              <Card>
                <EmptyState
                  icon={<MailPlus size={18} />}
                  title="Sem convites pendentes"
                  description="Novos convites aparecem aqui até serem aceitos, revogados ou expirarem."
                />
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-block__head">
          <div>
            <span className="section-kicker">Equipe</span>
            <h2>Membros do workspace</h2>
          </div>
          <Badge><Users2 size={12} /> {members.data?.length ?? 0}</Badge>
        </div>
        <div className="member-list">
          {(members.data ?? []).map((member) => (
            <div className="member-row" key={member.id}>
              <div className="avatar-mini">
                {member.user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <strong>{member.user.name}</strong>
                <span>{member.user.email}</span>
              </div>
              {canManage && member.role !== "OWNER" ? (
                <Select
                  value={member.role}
                  aria-label={`Papel de ${member.user.name}`}
                  onChange={(event) =>
                    updateRole.mutate({
                      id: member.id,
                      nextRole: event.target.value as Exclude<WorkspaceRole, "OWNER">,
                    })
                  }
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </Select>
              ) : (
                <Badge>{roleLabel[member.role]}</Badge>
              )}
              {canManage && member.role !== "OWNER" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover ${member.user.name} deste workspace?`)) {
                      remove.mutate(member.id);
                    }
                  }}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <div>
            <span className="section-kicker">Segurança da conta</span>
            <h2>Sessões ativas</h2>
          </div>
          <Badge><Laptop2 size={12} /> {activeSessions.length}</Badge>
        </div>
        <div className="session-list">
          {activeSessions.map((session) => (
            <article className="session-row" key={session.id}>
              <div className="session-row__icon"><Laptop2 size={15} /></div>
              <div>
                <strong>{deviceLabel(session.userAgent)}</strong>
                <span>
                  Último uso {new Date(session.lastUsedAt).toLocaleString("pt-BR")}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={revokeSession.isPending}
                onClick={() => revokeSession.mutate(session.id)}
              >
                <Trash2 size={12} /> Revogar
              </Button>
            </article>
          ))}
          {!sessions.isLoading && activeSessions.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={18} />}
              title="Nenhuma sessão ativa"
              description="Faça login novamente para criar uma nova sessão."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
