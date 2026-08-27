"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  Building2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  CreateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
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
import type { Client, Member } from "@/lib/types";

const statusLabel = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
} as const;

export function ClientsPage() {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    queryKey: ["client", workspaceId, selectedId],
    queryFn: () =>
      api.get<Client>(`/workspaces/${workspaceId}/clients/${selectedId}`),
    enabled: Boolean(workspaceId && selectedId),
  });

  const invalidate = async () => {
    if (!workspaceId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.clients(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: qk.dashboard(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: qk.activity(workspaceId) }),
    ]);
  };

  const archive = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/clients/${id}`),
    onSuccess: async () => {
      setSelectedId(null);
      await invalidate();
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("pt-BR");
    return (clients.data ?? []).filter((client) => {
      const matchesText =
        `${client.name} ${client.company ?? ""} ${client.email ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(needle);
      return matchesText && (status === "ALL" || client.status === status);
    });
  }, [clients.data, search, status]);

  if (!workspaceId || clients.isLoading) {
    return <LoadingPanel label="Carregando clientes…" />;
  }

  return (
    <>
      <PageHead
        eyebrow="Client operations"
        title="Clientes"
        description="Contexto suficiente para orientar projetos, responsáveis e automações — sem transformar o FlowDesk em um CRM inchado."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Novo cliente
          </Button>
        }
      />

      <div className="filters filters--spread">
        <div className="search-field">
          <Search />
          <Input
            aria-label="Buscar clientes"
            placeholder="Buscar cliente, empresa ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-actions">
          <Select
            aria-label="Filtrar clientes por status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </Select>
          <Badge>{filtered.length} na visão</Badge>
        </div>
      </div>

      {filtered.length ? (
        <div className="resource-grid">
          {filtered.map((client) => (
            <button
              type="button"
              className="resource-card resource-card--button"
              key={client.id}
              onClick={() => setSelectedId(client.id)}
            >
              <div className="resource-card__head">
                <div>
                  <h3>{client.name}</h3>
                  <p>
                    {client.company ||
                      client.email ||
                      "Cliente sem empresa associada"}
                  </p>
                </div>
                <span className="status-dot" data-status={client.status} />
              </div>
              {client.tags?.length ? (
                <div className="tag-row">
                  {client.tags.slice(0, 4).map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="resource-meta">
                <span>
                  <Building2 size={12} /> {client._count?.projects ?? 0}{" "}
                  projetos
                </span>
                <span>
                  <UserRound size={12} />{" "}
                  {client.assignedMember?.user.name ?? "Sem responsável"}
                </span>
              </div>
              <div className="resource-card__foot">
                <span>{statusLabel[client.status]}</span>
                <MoreHorizontal size={14} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Building2 size={19} />}
            title="Nenhum cliente por aqui"
            description={
              search || status !== "ALL"
                ? "Ajuste os filtros para ampliar a busca."
                : "Adicione o primeiro cliente para conectar projetos, responsáveis e automações."
            }
            action={
              !search && status === "ALL" ? (
                <Button onClick={() => setCreateOpen(true)}>
                  Criar cliente
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {createOpen ? (
        <ClientCreateSheet
          members={members.data ?? []}
          workspaceId={workspaceId}
          onClose={() => setCreateOpen(false)}
          onCreated={invalidate}
        />
      ) : null}

      {selectedId ? (
        <ClientDetailSheet
          client={detail.data}
          loading={detail.isLoading}
          members={members.data ?? []}
          workspaceId={workspaceId}
          archiving={archive.isPending}
          onClose={() => setSelectedId(null)}
          onSaved={async () => {
            await invalidate();
            await queryClient.invalidateQueries({
              queryKey: ["client", workspaceId, selectedId],
            });
          }}
          onArchive={() => archive.mutate(selectedId)}
        />
      ) : null}
    </>
  );
}

function ClientCreateSheet({
  members,
  workspaceId,
  onClose,
  onCreated,
}: {
  members: Member[];
  workspaceId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<
    z.input<typeof CreateClientSchema>,
    unknown,
    CreateClientInput
  >({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: {
      name: "",
      company: undefined,
      email: undefined,
      phone: undefined,
      notes: undefined,
      status: "ACTIVE",
      assignedMemberId: undefined,
      tags: [],
    },
  });
  const create = useMutation({
    mutationFn: (data: CreateClientInput) =>
      api.post(`/workspaces/${workspaceId}/clients`, data),
    onSuccess: async () => {
      await onCreated();
      onClose();
    },
  });

  return (
    <Sheet
      title="Novo cliente"
      subtitle="Crie o contexto operacional. O próximo projeto pode nascer de um workflow."
      onClose={onClose}
    >
      <form
        className="sheet-form"
        onSubmit={form.handleSubmit((data) => create.mutate(data))}
      >
        <Field label="Nome" error={form.formState.errors.name?.message}>
          <Input autoFocus {...form.register("name")} />
        </Field>
        <div className="field-grid">
          <Field label="Empresa">
            <Input {...form.register("company")} />
          </Field>
          <Field label="Status">
            <Select {...form.register("status")}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </Select>
          </Field>
        </div>
        <div className="field-grid">
          <Field label="E-mail" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </Field>
          <Field label="Telefone">
            <Input {...form.register("phone")} />
          </Field>
        </div>
        <Field label="Responsável">
          <Select {...form.register("assignedMemberId")}>
            <option value="">Sem responsável</option>
            {members.map((member) => (
              <option value={member.id} key={member.id}>
                {member.user.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tags">
          <Input
            placeholder="onboarding, enterprise"
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
        <Field label="Notas">
          <Textarea {...form.register("notes")} />
        </Field>
        {create.error ? (
          <p className="form-error">{create.error.message}</p>
        ) : null}
        <div className="sheet-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Criando…" : "Criar cliente"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function ClientDetailSheet({
  client,
  loading,
  members,
  workspaceId,
  archiving,
  onClose,
  onSaved,
  onArchive,
}: {
  client?: Client;
  loading: boolean;
  members: Member[];
  workspaceId: string;
  archiving: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onArchive: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateClientInput>({});
  const update = useMutation({
    mutationFn: (data: UpdateClientInput) =>
      api.patch(`/workspaces/${workspaceId}/clients/${client?.id}`, data),
    onSuccess: async () => {
      setEditing(false);
      await onSaved();
    },
  });

  const beginEdit = () => {
    if (!client) return;
    setDraft({
      name: client.name,
      company: client.company ?? null,
      email: client.email ?? null,
      phone: client.phone ?? null,
      notes: client.notes ?? null,
      status: client.status === "ARCHIVED" ? "INACTIVE" : client.status,
      assignedMemberId: client.assignedMemberId ?? null,
      tags: client.tags ?? [],
    });
    setEditing(true);
  };

  return (
    <Sheet
      title={client?.name ?? "Cliente"}
      subtitle={client?.company ?? "Detalhes do cliente"}
      onClose={onClose}
      detail
    >
      {loading || !client ? (
        <LoadingPanel label="Abrindo cliente…" />
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
          <div className="field-grid">
            <Field label="Empresa">
              <Input
                value={String(draft.company ?? "")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    company: event.target.value || null,
                  }))
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={String(draft.status ?? "ACTIVE")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    status: event.target.value as "ACTIVE" | "INACTIVE",
                  }))
                }
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </Select>
            </Field>
          </div>
          <div className="field-grid">
            <Field label="E-mail">
              <Input
                type="email"
                value={String(draft.email ?? "")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    email: event.target.value || null,
                  }))
                }
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={String(draft.phone ?? "")}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    phone: event.target.value || null,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Responsável">
            <Select
              value={String(draft.assignedMemberId ?? "")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  assignedMemberId: event.target.value || null,
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
          <Field label="Notas">
            <Textarea
              value={String(draft.notes ?? "")}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  notes: event.target.value || null,
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
              {update.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="detail-stack">
          <div className="detail-status-line">
            <Badge>
              <span className="status-dot" data-status={client.status} />{" "}
              {statusLabel[client.status]}
            </Badge>
            {client.assignedMember ? (
              <span>
                <UserRound size={13} /> {client.assignedMember.user.name}
              </span>
            ) : (
              <span>Sem responsável</span>
            )}
          </div>
          <div className="detail-grid">
            <Detail
              label="E-mail"
              value={client.email || "—"}
              icon={<Mail size={14} />}
            />
            <Detail label="Telefone" value={client.phone || "—"} />
            <Detail
              label="Projetos"
              value={String(client._count?.projects ?? 0)}
            />
          </div>
          {client.tags.length ? (
            <div className="tag-row">
              {client.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="detail-copy">
            <span>Notas</span>
            <p>{client.notes || "Nenhuma nota adicionada."}</p>
          </div>
          <div className="detail-actions">
            <Button variant="secondary" onClick={beginEdit}>
              Editar cliente
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
