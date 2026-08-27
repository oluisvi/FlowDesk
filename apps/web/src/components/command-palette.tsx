"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  LayoutDashboard,
  ListTodo,
  Network,
  Search,
  Settings,
  SquareKanban,
  Users2,
} from "lucide-react";

const items = [
  { terms: "visão geral dashboard overview", label: "Visão geral", path: "/app", icon: LayoutDashboard },
  { terms: "cliente clientes", label: "Clientes", path: "/app/clients", icon: Users2 },
  { terms: "projeto projetos", label: "Projetos", path: "/app/projects", icon: BriefcaseBusiness },
  { terms: "tarefa tarefas", label: "Tarefas", path: "/app/tasks", icon: ListTodo },
  { terms: "board kanban", label: "Board", path: "/app/board", icon: SquareKanban },
  { terms: "workflow workflows automação", label: "Workflows", path: "/app/workflows", icon: Network },
  { terms: "atividade histórico", label: "Atividade", path: "/app/activity", icon: Activity },
  { terms: "notificação notificações inbox", label: "Notificações", path: "/app/notifications", icon: Bell },
  { terms: "configuração configurações membros", label: "Configurações", path: "/app/settings", icon: Settings },
] as const;

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ) ?? [],
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) =>
      `${item.label} ${item.terms}`.toLocaleLowerCase("pt-BR").includes(needle),
    );
  }, [query]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(visible.length - 1, 0)));
  }, [visible.length]);

  if (!open) return null;

  const choose = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div
      className="command-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="command" role="dialog" aria-modal="true" aria-label="Comandos">
        <div className="command-input">
          <Search size={17} />
          <input
            autoFocus
            placeholder="Ir para, buscar ou executar…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  visible.length ? (index + 1) % visible.length : 0,
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) =>
                  visible.length
                    ? (index - 1 + visible.length) % visible.length
                    : 0,
                );
              }
              if (event.key === "Enter" && visible[activeIndex]) {
                choose(visible[activeIndex].path);
              }
            }}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-list" role="listbox">
          {visible.map((item, index) => (
            <button
              className="command-item"
              data-active={index === activeIndex}
              aria-selected={index === activeIndex}
              role="option"
              key={item.path}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(item.path)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              <small>{index === activeIndex ? "↵" : ""}</small>
            </button>
          ))}
          {visible.length === 0 ? (
            <div className="fd-empty command-empty">Nenhum comando encontrado.</div>
          ) : null}
        </div>
        <div className="command-footer">
          <span>↑↓ navegar</span><span>↵ abrir</span><span>esc fechar</span>
        </div>
      </div>
    </div>
  );
}
