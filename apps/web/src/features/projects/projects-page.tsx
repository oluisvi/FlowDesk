"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  Plus,
  Search,
  Users2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  CreateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@flowdesk/shared";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Textarea,
} from "@flowdesk/ui";
import { LoadingPanel } from "@/components/loading-panel";
import { Sheet } from "@/components/sheet";
import { PageHead } from "@/components/page-head";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { Client, Member, Project } from "@/lib/types";

const statusLabel: Record<Project["status"], string> = {
  PLANNED: "Planejado",
  ACTIVE: "Ativo",
  ON_HOLD: "Em espera",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado",
};

export function ProjectsPage() {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projects = useQuery({
    queryKey: workspaceId ? qk.projects(workspaceId) : ["projects", "none"],
    queryFn: () => api.get<Project[]>(`/workspaces/${workspaceId}/projects`),
    enabled: Boolean(workspaceId),
  });
  const clients = useQuery({
    queryKey: workspaceId ? qk.clients(workspaceId) : ["clients", "none"],
    queryFn: () => api.get<Client[]>(`/workspaces/${workspaceId}/clients`),
    enabled: Boolean(workspaceId),
  });
  const members = useQuery({
    queryKey: workspaceId ? qk.members(workspaceId) : ["members", "none"],
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
  });
  const detail = useQuery({
    queryKey: ["project", workspaceId, selectedId],
    queryFn: () =>
      api.get<ProjectDetail>(
        `/workspaces/${workspaceId}/projects/${selectedId}`,
      ),
    enabled: Boolean(workspaceId && selectedId),
  });

  const invalidate = async () => {
    if (!workspaceId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.projects(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: qk.dashboard(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: qk.activity(workspaceId) }),
    ]);
  };

  const archive = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/projects/${id}`),
    onSuccess: async () => {
      setSelectedId(null);
      await invalidate();
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("pt-BR");
    return (projects.data ?? []).filter(
      (project) =>
        `${project.name} ${project.client?.name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(needle) &&
        (status === "ALL" || project.status === status),
    );
  }, [projects.data, search, status]);

  if (!workspaceId || projects.isLoading)
    return <LoadingPanel label="Carregando projetos…" />;

  return (
    <>
      <PageHead
        eyebrow="Project portfolio"
        title="Projetos"
        description="A camada que liga cliente, pessoas, tarefas e automações sem esconder a responsabilidade operacional."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Novo projeto
          </Button>
        }
      />
      <div className="filters filters--spread">
        <div className="search-field">
          <Search />
          <Input
            aria-label="Buscar projetos"
            placeholder="Buscar projeto ou cliente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-actions">
          <Select
            aria-label="Filtrar projetos por status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">Todos os status</option>
            <option value="PLANNED">Planejados</option>
            <option value="ACTIVE">Ativos</option>
            <option value="ON_HOLD">Em espera</option>
            <option value="COMPLETED">Concluídos</option>
          </Select>
          <Badge>{filtered.length} projetos</Badge>
        </div>
      </div>

      {filtered.length ? (
        <div className="project-list">
          {filtered.map((project) => (
            <button
              className="project-row"
              key={project.id}
              onClick={() => setSelectedId(project.id)}
            >
              <span className="project-row__lead">
                <i className="status-dot" data-status={project.status} />
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.client?.name ?? "Projeto interno"}</small>
                </span>
              </span>
              <span className="priority" data-priority={project.priority}>
                {project.priority}
              </span>
              <span className="project-row__metric">
                <Users2 size={13} /> {project._count?.tasks ?? 0} tarefas
              </span>
              <span className="project-row__metric">
                <CalendarDays size={13} />{" "}
                {project.deadline
                  ? new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(project.deadline))
                  : "Sem prazo"}
              </span>
              <Badge>{statusLabel[project.status]}</Badge>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BriefcaseBusiness size={20} />}
            title="Nenhum projeto nesta visão"
            description={
              search || status !== "ALL"
                ? "Ajuste os filtros para ampliar a busca."
                : "Crie um projeto manualmente ou deixe um workflow criar o próximo."
            }
            action={
              !search && status === "ALL" ? (
                <Button onClick={() => setCreateOpen(true)}>
                  Criar projeto
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {createOpen ? (
        <ProjectCreateSheet
          workspaceId={workspaceId}
          clients={clients.data ?? []}
          onClose={() => setCreateOpen(false)}
          onCreated={invalidate}
        />
      ) : null}
      {selectedId ? (
        <ProjectDetailSheet
          workspaceId={workspaceId}
          project={detail.data}
          loading={detail.isLoading}
          clients={clients.data ?? []}
          members={members.data ?? []}
          archiving={archive.isPending}
          onClose={() => setSelectedId(null)}
          onArchive={() => archive.mutate(selectedId)}
          onSaved={async () => {
            await invalidate();
            await queryClient.invalidateQueries({
              queryKey: ["project", workspaceId, selectedId],
            });
          }}
        />
      ) : null}
    </>
  );
}

interface ProjectDetail extends Project {
  description?: string | null;
  members: Array<{
    membershipId: string;
    membership: {
      id: string;
      user: { id: string; name: string; email: string };
    };
  }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string }>;
}

function ProjectCreateSheet({
  workspaceId,
  clients,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  clients: Client[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<
    z.input<typeof CreateProjectSchema>,
    unknown,
    CreateProjectInput
  >({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: "",
      description: undefined,
      clientId: undefined,
      status: "PLANNED",
      priority: "MEDIUM",
      deadline: undefined,
    },
  });
  const create = useMutation({
    mutationFn: (data: CreateProjectInput) =>
      api.post(`/workspaces/${workspaceId}/projects`, data),
    onSuccess: async () => {
      await onCreated();
      onClose();
    },
  });
  return (
    <Sheet
      title="Novo projeto"
      subtitle="Defina contexto e deixe as tarefas nascerem com clareza."
      onClose={onClose}
    >
      <form
        className="sheet-form"
        onSubmit={form.handleSubmit((data) => create.mutate(data))}
      >
        <Field label="Nome" error={form.formState.errors.name?.message}>
          <Input autoFocus {...form.register("name")} />
        </Field>
        <Field label="Cliente">
          <Select {...form.register("clientId")}>
            <option value="">Projeto interno</option>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="field-grid">
          <Field label="Status">
            <Select {...form.register("status")}>
              <option value="PLANNED">Planejado</option>
              <option value="ACTIVE">Ativo</option>
              <option value="ON_HOLD">Em espera</option>
              <option value="COMPLETED">Concluído</option>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select {...form.register("priority")}>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </Select>
          </Field>
        </div>
        <Field label="Prazo">
          <Input
            type="datetime-local"
            onChange={(event) =>
              form.setValue(
                "deadline",
                event.target.value
                  ? new Date(event.target.value).toISOString()
                  : undefined,
              )
            }
          />
        </Field>
        <Field label="Descrição">
          <Textarea {...form.register("description")} />
        </Field>
        {create.error ? (
          <p className="form-error">{create.error.message}</p>
        ) : null}
        <div className="sheet-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Criando…" : "Criar projeto"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function ProjectDetailSheet({
  workspaceId,
  project,
  loading,
  clients,
  members,
  archiving,
  onClose,
  onArchive,
  onSaved,
}: {
  workspaceId: string;
  project?: ProjectDetail;
  loading: boolean;
  clients: Client[];
  members: Member[];
  archiving: boolean;
  onClose: () => void;
  onArchive: () => void;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateProjectInput>({});
  const update = useMutation({
    mutationFn: (data: UpdateProjectInput) =>
      api.patch(`/workspaces/${workspaceId}/projects/${project?.id}`, data),
    onSuccess: async () => {
      setEditing(false);
      await onSaved();
    },
  });
  const addMember = useMutation({
    mutationFn: (membershipId: string) =>
      api.post(`/workspaces/${workspaceId}/projects/${project?.id}/members`, {
        membershipId,
      }),
    onSuccess: onSaved,
  });
  const removeMember = useMutation({
    mutationFn: (membershipId: string) =>
      api.delete(
        `/workspaces/${workspaceId}/projects/${project?.id}/members/${membershipId}`,
      ),
    onSuccess: onSaved,
  });
  const [memberId, setMemberId] = useState("");
  const beginEdit = () => {
    if (!project) return;
    setDraft({
      name: project.name,
      description: project.description ?? null,
      clientId: project.clientId ?? null,
      status: project.status === "ARCHIVED" ? "ON_HOLD" : project.status,
      priority: project.priority,
      deadline: project.deadline ?? null,
    });
    setEditing(true);
  };
  return (
    <Sheet
      title={project?.name ?? "Projeto"}
      subtitle={project?.client?.name ?? "Projeto interno"}
      onClose={onClose}
      detail
      detailLabel="Projeto"
    >
      {loading || !project ? (
        <LoadingPanel label="Abrindo projeto…" />
      ) : editing ? (
        <div className="sheet-form">
          <Field label="Nome">
            <Input
              value={String(draft.name ?? "")}
              onChange={(event) =>
                setDraft((value) => ({ ...value, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Cliente">
            <Select
              value={String(draft.clientId ?? "")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  clientId: event.target.value || null,
                }))
              }
            >
              <option value="">Projeto interno</option>
              {clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="field-grid">
            <Field label="Status">
              <Select
                value={String(draft.status ?? "PLANNED")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    status: event.target.value as UpdateProjectInput["status"],
                  }))
                }
              >
                <option value="PLANNED">Planejado</option>
                <option value="ACTIVE">Ativo</option>
                <option value="ON_HOLD">Em espera</option>
                <option value="COMPLETED">Concluído</option>
              </Select>
            </Field>
            <Field label="Prioridade">
              <Select
                value={String(draft.priority ?? "MEDIUM")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    priority: event.target.value as Project["priority"],
                  }))
                }
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </Select>
            </Field>
          </div>
          <Field label="Prazo">
            <Input
              type="datetime-local"
              value={toLocalDateTimeValue(draft.deadline)}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  deadline: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : null,
                }))
              }
            />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={String(draft.description ?? "")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  description: event.target.value || null,
                }))
              }
            />
          </Field>
          {update.error ? (
            <p className="form-error">{update.error.message}</p>
          ) : null}
          <div className="sheet-actions">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!draft.name || update.isPending}
              onClick={() => update.mutate(draft)}
            >
              {update.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="detail-stack">
          <div className="detail-status-line">
            <Badge>
              <span className="status-dot" data-status={project.status} />{" "}
              {statusLabel[project.status]}
            </Badge>
            <span className="priority" data-priority={project.priority}>
              {project.priority}
            </span>
          </div>
          <div className="detail-copy">
            <span>Descrição</span>
            <p>{project.description || "Sem descrição."}</p>
          </div>
          <section className="detail-section">
            <div className="detail-section__head">
              <span>Equipe do projeto</span>
              <Badge>{project.members.length}</Badge>
            </div>
            <div className="member-chips">
              {project.members.map((item) => (
                <span className="member-chip" key={item.membershipId}>
                  {item.membership.user.name}
                  <button
                    aria-label={`Remover ${item.membership.user.name}`}
                    onClick={() => removeMember.mutate(item.membershipId)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="inline-form">
              <Select
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              >
                <option value="">Adicionar membro…</option>
                {members
                  .filter(
                    (member) =>
                      !project.members.some(
                        (item) => item.membershipId === member.id,
                      ),
                  )
                  .map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.user.name}
                    </option>
                  ))}
              </Select>
              <Button
                size="sm"
                disabled={!memberId || addMember.isPending}
                onClick={() => {
                  addMember.mutate(memberId);
                  setMemberId("");
                }}
              >
                Adicionar
              </Button>
            </div>
          </section>
          <section className="detail-section">
            <div className="detail-section__head">
              <span>Tarefas</span>
              <Badge>{project.tasks.length}</Badge>
            </div>
            <div className="mini-task-list">
              {project.tasks.slice(0, 8).map((task) => (
                <div key={task.id}>
                  <span className="status-dot" data-status={task.status} />
                  <strong>{task.title}</strong>
                  <small>{task.priority}</small>
                </div>
              ))}
              {!project.tasks.length ? (
                <p className="muted-copy">Nenhuma tarefa ainda.</p>
              ) : null}
            </div>
          </section>
          <div className="detail-actions">
            <Button variant="secondary" onClick={beginEdit}>
              Editar projeto
            </Button>
            <Button variant="danger" disabled={archiving} onClick={onArchive}>
              <Archive size={13} /> {archiving ? "Arquivando…" : "Arquivar"}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>
        <span className="field-label__text">{label}</span>
        {children}
      </label>
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}

function toLocalDateTimeValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
