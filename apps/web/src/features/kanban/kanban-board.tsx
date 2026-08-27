"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GripVertical,
  RotateCcw,
  SquareKanban,
} from "lucide-react";
import { Button, Card, EmptyState, Skeleton } from "@flowdesk/ui";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import type { Task } from "@/lib/types";

const columns = [
  { id: "BACKLOG", label: "Backlog", hint: "Ainda não priorizado" },
  { id: "TODO", label: "A fazer", hint: "Pronto para começar" },
  { id: "IN_PROGRESS", label: "Em andamento", hint: "Trabalho ativo" },
  { id: "REVIEW", label: "Revisão", hint: "Aguardando validação" },
  { id: "DONE", label: "Concluído", hint: "Entrega finalizada" },
] as const;

type Status = Task["status"];

const priorityLabel: Record<Task["priority"], string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function optimisticMove(tasks: Task[], id: string, status: Status) {
  return tasks.map((task) => (task.id === id ? { ...task, status } : task));
}

function initials(name?: string) {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function TaskCard({
  task,
  overlay = false,
  onMove,
}: {
  task: Task;
  overlay?: boolean;
  onMove?: (status: Status) => void;
}) {
  const drag = useDraggable({
    id: task.id,
    disabled: overlay,
    data: { status: task.status },
  });
  const index = columns.findIndex((column) => column.id === task.status);
  const previous = columns[index - 1]?.id;
  const next = columns[index + 1]?.id;
  const style = overlay
    ? undefined
    : { transform: CSS.Translate.toString(drag.transform) };

  return (
    <article
      ref={drag.setNodeRef}
      style={style}
      className="task-card"
      data-dragging={drag.isDragging}
      data-overlay={overlay}
    >
      <div className="task-card__top">
        <button
          type="button"
          className="task-card__grip"
          aria-label={`Mover ${task.title}. Pressione espaço para iniciar o arraste.`}
          {...drag.listeners}
          {...drag.attributes}
        >
          <GripVertical size={14} />
        </button>
        <h3>{task.title}</h3>
      </div>

      {task.project ? <p className="task-card__project">{task.project.name}</p> : null}

      <div className="task-card__meta">
        <span className="priority" data-priority={task.priority}>
          {priorityLabel[task.priority]}
        </span>
        {task.dueDate ? (
          <span className="task-card__date">
            <CalendarDays size={12} />
            {new Intl.DateTimeFormat("pt-BR", {
              day: "2-digit",
              month: "short",
            }).format(new Date(task.dueDate))}
          </span>
        ) : null}
        <span
          className="avatar-mini"
          title={task.assignee?.user.name ?? "Sem responsável"}
          aria-label={task.assignee?.user.name ?? "Sem responsável"}
        >
          {initials(task.assignee?.user.name)}
        </span>
      </div>

      {!overlay && onMove ? (
        <div className="task-card__keyboard-actions" aria-label="Mover entre colunas">
          <button
            type="button"
            disabled={!previous}
            onClick={() => previous && onMove(previous)}
            aria-label="Mover uma coluna para a esquerda"
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onMove(next)}
            aria-label="Mover uma coluna para a direita"
          >
            <ArrowRight size={12} />
          </button>
        </div>
      ) : null}
    </article>
  );
}

function Column({
  id,
  label,
  hint,
  tasks,
  onMove,
}: {
  id: Status;
  label: string;
  hint: string;
  tasks: Task[];
  onMove: (taskId: string, status: Status) => void;
}) {
  const drop = useDroppable({ id });
  return (
    <section
      ref={drop.setNodeRef}
      className="board-column"
      data-over={drop.isOver}
      data-testid={`column-${id.toLowerCase()}`}
      aria-label={`${label}: ${tasks.length} tarefa${tasks.length === 1 ? "" : "s"}`}
    >
      <header className="board-column__head">
        <div>
          <span className="board-column__title">
            <i className="status-dot" data-status={id} />
            {label}
          </span>
          <small>{hint}</small>
        </div>
        <span className="column-count">{tasks.length}</span>
      </header>
      <div className="board-column__body">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onMove={(status) => onMove(task.id, status)}
          />
        ))}
        {tasks.length === 0 ? (
          <div className="board-column__empty">Solte uma tarefa aqui</div>
        ) : null}
      </div>
    </section>
  );
}

export function KanbanBoard() {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const queryKey = workspaceId ? qk.tasks(workspaceId) : ["tasks", "none"];
  const query = useQuery({
    queryKey,
    queryFn: () => api.get<Task[]>(`/workspaces/${workspaceId}/tasks`),
    enabled: Boolean(workspaceId),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      api.patch(`/workspaces/${workspaceId}/tasks/${id}`, { status }),
    onMutate: async (variables) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];
      queryClient.setQueryData(
        queryKey,
        optimisticMove(previous, variables.id, variables.status),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      setError("Não foi possível mover a tarefa. O board voltou ao estado anterior.");
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        workspaceId
          ? queryClient.invalidateQueries({ queryKey: qk.dashboard(workspaceId) })
          : Promise.resolve(),
      ]);
    },
  });

  const tasks = query.data ?? [];
  const groups = useMemo(
    () =>
      new Map<Status, Task[]>(
        columns.map((column) => [
          column.id,
          tasks.filter((task) => task.status === column.id),
        ]),
      ),
    [tasks],
  );
  const active = tasks.find((task) => task.id === activeId);

  const move = (taskId: string, status: Status) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status || mutation.isPending) return;
    mutation.mutate({ id: taskId, status });
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over) return;
    const status = String(event.over.id) as Status;
    if (!columns.some((column) => column.id === status)) return;
    move(String(event.active.id), status);
  };

  if (query.isLoading) {
    return (
      <div className="board-loading" aria-label="Carregando board">
        {columns.map((column) => (
          <Card key={column.id} className="board-loading__column">
            <Skeleton style={{ height: 22, width: "48%" }} />
            <Skeleton style={{ height: 126, marginTop: 18 }} />
            <Skeleton style={{ height: 112, marginTop: 10 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <EmptyState
          icon={<AlertTriangle />}
          title="Não foi possível abrir o board"
          description="Verifique a conexão com a API e tente carregar novamente."
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              <RotateCcw size={14} /> Tentar novamente
            </Button>
          }
        />
      </Card>
    );
  }

  if (!tasks.length) {
    return (
      <Card>
        <EmptyState
          icon={<SquareKanban />}
          title="O board está vazio"
          description="Crie tarefas e mova o trabalho entre os estados operacionais."
        />
      </Card>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="board-wrap" tabIndex={0} aria-label="Board de tarefas">
          <div className="board">
            {columns.map((column) => (
              <Column
                key={column.id}
                {...column}
                tasks={groups.get(column.id) ?? []}
                onMove={move}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          {active ? <TaskCard task={active} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {error ? (
        <div className="toast" role="alert">
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
