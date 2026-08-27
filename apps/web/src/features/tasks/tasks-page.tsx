"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  CheckSquare2,
  Clock3,
  MessageSquare,
  Plus,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  CreateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
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
import type { Member, Project, Task, User } from "@/lib/types";

const statusLabel: Record<Task["status"], string> = {
  BACKLOG: "Backlog",
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  REVIEW: "Revisão",
  DONE: "Concluída",
};

interface TaskDetail extends Task {
  project?: (Project & { client?: { id: string; name: string } | null }) | null;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: User;
  }>;
}

export function TasksPage() {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const tasks = useQuery({
    queryKey: workspaceId ? qk.tasks(workspaceId) : ["tasks", "none"],
    queryFn: () => api.get<Task[]>(`/workspaces/${workspaceId}/tasks`),
    enabled: Boolean(workspaceId),
  });
  const projects = useQuery({
    queryKey: workspaceId ? qk.projects(workspaceId) : ["projects", "none"],
    queryFn: () => api.get<Project[]>(`/workspaces/${workspaceId}/projects`),
    enabled: Boolean(workspaceId),
  });
  const members = useQuery({
    queryKey: workspaceId ? qk.members(workspaceId) : ["members", "none"],
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
  });
  const detail = useQuery({
    queryKey: ["task", workspaceId, selectedId],
    queryFn: () =>
      api.get<TaskDetail>(`/workspaces/${workspaceId}/tasks/${selectedId}`),
    enabled: Boolean(workspaceId && selectedId),
  });

  const invalidate = async () => {
    if (!workspaceId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.tasks(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: qk.dashboard(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: qk.activity(workspaceId) }),
    ]);
  };

  const archive = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/tasks/${id}`),
    onSuccess: async () => {
      setSelectedId(null);
      await invalidate();
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("pt-BR");
    return (tasks.data ?? []).filter((task) => {
      const text =
        `${task.title} ${task.project?.name ?? ""} ${task.assignee?.user.name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(needle);
      return text && (status === "ALL" || task.status === status);
    });
  }, [tasks.data, search, status]);

  if (!workspaceId || tasks.isLoading)
    return <LoadingPanel label="Carregando tarefas…" />;

  return (
    <>
      <PageHead
        eyebrow="Execution layer"
        title="Tarefas"
        description="Responsabilidade operacional com projeto, prazo, prioridade, conversa e histórico — sem perder velocidade."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Nova tarefa
          </Button>
        }
      />
      <div className="filters filters--spread">
        <div className="search-field">
          <Search />
          <Input
            aria-label="Buscar tarefas"
            placeholder="Buscar tarefa, projeto ou responsável"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-actions">
          <Select
            value={status}
            aria-label="Filtrar tarefas por status"
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">Todos os status</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </Select>
          <Badge>
            {filtered.filter((task) => task.status !== "DONE").length} abertas
          </Badge>
        </div>
      </div>

      {filtered.length ? (
        <Card className="table-panel">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarefa</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Responsável</th>
                  <th>Prazo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedId(task.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSelectedId(task.id);
                    }}
                  >
                    <td>
                      <span className="cell-main">{task.title}</span>
                      <span className="cell-sub">
                        {task.project?.name ?? "Sem projeto"}
                      </span>
                    </td>
                    <td>
                      <span className="table-status">
                        <i className="status-dot" data-status={task.status} />
                        {statusLabel[task.status]}
                      </span>
                    </td>
                    <td>
                      <span className="priority" data-priority={task.priority}>
                        {task.priority}
                      </span>
                    </td>
                    <td>{task.assignee?.user.name ?? "—"}</td>
                    <td>
                      {task.dueDate
                        ? new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          }).format(new Date(task.dueDate))
                        : "—"}
                    </td>
                    <td>
                      <MessageSquare size={14} />
                      <small className="comment-count">
                        {task._count?.comments ?? 0}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<CheckSquare2 size={19} />}
            title="Nenhuma tarefa nesta visão"
            description={
              search || status !== "ALL"
                ? "Ajuste os filtros para ampliar a busca."
                : "Crie a primeira tarefa ou deixe um workflow gerar o próximo passo automaticamente."
            }
            action={
              !search && status === "ALL" ? (
                <Button onClick={() => setCreateOpen(true)}>
                  Criar tarefa
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {createOpen ? (
        <TaskCreateSheet
          workspaceId={workspaceId}
          projects={projects.data ?? []}
          members={members.data ?? []}
          onClose={() => setCreateOpen(false)}
          onCreated={invalidate}
        />
      ) : null}
      {selectedId ? (
        <TaskDetailSheet
          workspaceId={workspaceId}
          task={detail.data}
          loading={detail.isLoading}
          projects={projects.data ?? []}
          members={members.data ?? []}
          archiving={archive.isPending}
          onClose={() => setSelectedId(null)}
          onArchive={() => archive.mutate(selectedId)}
          onSaved={async () => {
            await invalidate();
            await queryClient.invalidateQueries({
              queryKey: ["task", workspaceId, selectedId],
            });
          }}
        />
      ) : null}
    </>
  );
}

function TaskCreateSheet({
  workspaceId,
  projects,
  members,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  projects: Project[];
  members: Member[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<
    z.input<typeof CreateTaskSchema>,
    unknown,
    CreateTaskInput
  >({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      title: "",
      description: undefined,
      projectId: undefined,
      assigneeId: undefined,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: undefined,
      tags: [],
    },
  });
  const create = useMutation({
    mutationFn: (data: CreateTaskInput) =>
      api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: async () => {
      await onCreated();
      onClose();
    },
  });
  return (
    <Sheet
      title="Nova tarefa"
      subtitle="Defina o próximo passo com responsabilidade clara."
      onClose={onClose}
    >
      <form
        className="sheet-form"
        onSubmit={form.handleSubmit((data) => create.mutate(data))}
      >
        <Field label="Título" error={form.formState.errors.title?.message}>
          <Input autoFocus {...form.register("title")} />
        </Field>
        <Field label="Projeto">
          <Select {...form.register("projectId")}>
            <option value="">Sem projeto</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável">
          <Select {...form.register("assigneeId")}>
            <option value="">Sem responsável</option>
            {members.map((member) => (
              <option value={member.id} key={member.id}>
                {member.user.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="field-grid">
          <Field label="Status">
            <Select {...form.register("status")}>
              {Object.entries(statusLabel).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
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
                "dueDate",
                event.target.value
                  ? new Date(event.target.value).toISOString()
                  : undefined,
              )
            }
          />
        </Field>
        <Field label="Tags">
          <Input
            placeholder="frontend, urgente"
            value={(form.watch("tags") ?? []).join(", ")}
            onChange={(event) =>
              form.setValue(
                "tags",
                event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
                { shouldValidate: true },
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
            {create.isPending ? "Criando…" : "Criar tarefa"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function TaskDetailSheet({
  workspaceId,
  task,
  loading,
  projects,
  members,
  archiving,
  onClose,
  onArchive,
  onSaved,
}: {
  workspaceId: string;
  task?: TaskDetail;
  loading: boolean;
  projects: Project[];
  members: Member[];
  archiving: boolean;
  onClose: () => void;
  onArchive: () => void;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateTaskInput>({});
  const [comment, setComment] = useState("");
  const update = useMutation({
    mutationFn: (data: UpdateTaskInput) =>
      api.patch(`/workspaces/${workspaceId}/tasks/${task?.id}`, data),
    onSuccess: async () => {
      setEditing(false);
      await onSaved();
    },
  });
  const addComment = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/tasks/${task?.id}/comments`, {
        content: comment.trim(),
      }),
    onSuccess: async () => {
      setComment("");
      await onSaved();
    },
  });
  const beginEdit = () => {
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description ?? null,
      projectId: task.projectId ?? null,
      assigneeId: task.assigneeId ?? null,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
      tags: task.tags,
    });
    setEditing(true);
  };
  return (
    <Sheet
      title={task?.title ?? "Tarefa"}
      subtitle={task?.project?.name ?? "Tarefa sem projeto"}
      onClose={onClose}
      detail
      detailLabel="Tarefa"
    >
      {loading || !task ? (
        <LoadingPanel label="Abrindo tarefa…" />
      ) : editing ? (
        <div className="sheet-form">
          <Field label="Título">
            <Input
              value={String(draft.title ?? "")}
              onChange={(event) =>
                setDraft((value) => ({ ...value, title: event.target.value }))
              }
            />
          </Field>
          <Field label="Projeto">
            <Select
              value={String(draft.projectId ?? "")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  projectId: event.target.value || null,
                }))
              }
            >
              <option value="">Sem projeto</option>
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável">
            <Select
              value={String(draft.assigneeId ?? "")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  assigneeId: event.target.value || null,
                }))
              }
            >
              <option value="">Sem responsável</option>
              {members.map((member) => (
                <option value={member.id} key={member.id}>
                  {member.user.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="field-grid">
            <Field label="Status">
              <Select
                value={String(draft.status ?? "TODO")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    status: event.target.value as Task["status"],
                  }))
                }
              >
                {Object.entries(statusLabel).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridade">
              <Select
                value={String(draft.priority ?? "MEDIUM")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    priority: event.target.value as Task["priority"],
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
              value={toLocalDateTimeValue(draft.dueDate)}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  dueDate: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : null,
                }))
              }
            />
          </Field>
          <Field label="Tags">
            <Input
              value={(draft.tags ?? []).join(", ")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
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
              disabled={!draft.title || update.isPending}
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
              <span className="status-dot" data-status={task.status} />{" "}
              {statusLabel[task.status]}
            </Badge>
            <span className="priority" data-priority={task.priority}>
              {task.priority}
            </span>
          </div>
          <div className="detail-grid">
            <Detail
              label="Responsável"
              value={task.assignee?.user.name ?? "Sem responsável"}
              icon={<UserRound size={14} />}
            />
            <Detail
              label="Prazo"
              value={
                task.dueDate
                  ? new Date(task.dueDate).toLocaleString("pt-BR")
                  : "Sem prazo"
              }
              icon={<Clock3 size={14} />}
            />
            <Detail
              label="Projeto"
              value={task.project?.name ?? "Sem projeto"}
            />
          </div>
          {task.tags.length ? (
            <div className="tag-row">
              {task.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="detail-copy">
            <span>Descrição</span>
            <p>{task.description || "Sem descrição."}</p>
          </div>
          <section className="comments-section">
            <div className="detail-section__head">
              <span>Conversa</span>
              <Badge>{task.comments.length}</Badge>
            </div>
            <div className="comment-thread">
              {task.comments.map((item) => (
                <article className="comment" key={item.id}>
                  <div className="avatar-mini">
                    {item.author.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div>
                      <strong>{item.author.name}</strong>
                      <time>
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </time>
                    </div>
                    <p>{item.content}</p>
                  </div>
                </article>
              ))}
              {!task.comments.length ? (
                <p className="muted-copy">Sem comentários ainda.</p>
              ) : null}
            </div>
            <div className="comment-composer">
              <Textarea
                placeholder="Adicionar contexto para a equipe…"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <Button
                size="sm"
                disabled={!comment.trim() || addComment.isPending}
                onClick={() => addComment.mutate()}
              >
                <Send size={13} /> Enviar
              </Button>
            </div>
          </section>
          <div className="detail-actions">
            <Button variant="secondary" onClick={beginEdit}>
              Editar tarefa
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
function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="detail-cell">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
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
