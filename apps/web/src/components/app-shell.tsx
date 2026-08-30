"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Command,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Network,
  Search,
  Settings,
  SquareKanban,
  Sun,
  Users2,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button, Input } from "@flowdesk/ui";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { Brand } from "./brand";
import { CommandPalette } from "./command-palette";

const nav = [
  { label: "Visão geral", href: "/app", icon: LayoutDashboard },
  { label: "Clientes", href: "/app/clients", icon: Users2 },
  { label: "Projetos", href: "/app/projects", icon: BriefcaseBusiness },
  { label: "Tarefas", href: "/app/tasks", icon: ListTodo },
  { label: "Board", href: "/app/board", icon: SquareKanban },
  { label: "Workflows", href: "/app/workflows", icon: Network },
  { label: "Atividade", href: "/app/activity", icon: Activity },
  { label: "Notificações", href: "/app/notifications", icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const {
    ready,
    user,
    workspaces,
    workspaceId,
    setWorkspaceId,
    logout,
    reloadWorkspaces,
  } = useSession();
  const router = useRouter();
  const path = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const closeCommand = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => setMobileOpen(false), [path]);

  useEffect(() => {
    if (!mobileOpen || !window.matchMedia("(max-width: 820px)").matches) return;

    const panel = sidebarRef.current;
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableSelector =
      'a[href],button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("hidden"),
      );
    focusable()[0]?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      mobileMenuButtonRef.current?.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const notifications = useQuery({
    queryKey: workspaceId ? qk.notifications(workspaceId) : ["notifications", "none"],
    queryFn: () =>
      api.get<Array<{ readAt: string | null }>>(
        `/workspaces/${workspaceId}/notifications?unread=true`,
      ),
    enabled: Boolean(workspaceId),
    refetchInterval: 30_000,
  });

  const active = workspaces.find((item) => item.workspace.id === workspaceId);
  const initials = (user?.name ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const createWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setCreating(true);
    setWorkspaceError("");
    try {
      const workspace = await api.post<{ id: string }>("/workspaces", {
        name: workspaceName.trim(),
      });
      await reloadWorkspaces();
      setWorkspaceId(workspace.id);
      setWorkspaceName("");
    } catch (error) {
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o workspace.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (!ready || !user) {
    return <div className="app-boot">Preparando sua operação…</div>;
  }

  if (workspaces.length === 0) {
    return (
      <main className="workspace-onboarding">
        <section className="workspace-onboarding__panel">
          <Brand />
          <div className="workspace-onboarding__signal" aria-hidden="true">
            <span />
            <i />
            <span />
            <i />
            <span />
          </div>
          <h1>Crie seu primeiro workspace.</h1>
          <p>
            O workspace isola membros, clientes, projetos, tarefas e automações.
            Comece apenas pelo nome da operação.
          </p>
          <div className="field">
            <label htmlFor="workspace-name">Nome do workspace</label>
            <Input
              id="workspace-name"
              autoFocus
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Ex.: ServAgency"
              onKeyDown={(event) => {
                if (event.key === "Enter") void createWorkspace();
              }}
            />
          </div>
          {workspaceError ? (
            <p className="form-error" role="alert">{workspaceError}</p>
          ) : null}
          <Button
            size="lg"
            style={{ width: "100%" }}
            disabled={creating || !workspaceName.trim()}
            onClick={() => void createWorkspace()}
          >
            {creating ? "Criando…" : "Criar workspace"}
          </Button>
        </section>
      </main>
    );
  }

  const sidebar = (
    <aside
      ref={sidebarRef}
      className="sidebar"
      data-mobile-open={mobileOpen}
      aria-label="Navegação principal"
      tabIndex={-1}
    >
      <div className="sidebar-brand">
        <Brand />
        <div className="sidebar-brand__actions">
          <button
            className="icon-button sidebar-command-button"
            aria-label="Abrir comandos"
            onClick={() => setCommandOpen(true)}
          >
            <Command size={15} />
          </button>
          <button
            className="icon-button sidebar-mobile-close"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="workspace-switcher-wrap">
        <span className="workspace-switcher-dot" aria-hidden="true" />
        <select
          className="workspace-switcher"
          value={workspaceId ?? ""}
          onChange={(event) => setWorkspaceId(event.target.value)}
          aria-label="Workspace atual"
        >
          {workspaces.map((item) => (
            <option value={item.workspace.id} key={item.workspace.id}>
              {item.workspace.name}
            </option>
          ))}
        </select>
        <small>{active?.role ?? "VIEWER"}</small>
      </div>

      <nav className="nav-section">
        <div className="nav-label">Operação</div>
        {nav.map((item) => {
          const selected =
            item.href === "/app" ? path === "/app" : path.startsWith(item.href);
          return (
            <Link
              className="nav-link"
              data-active={selected}
              aria-current={selected ? "page" : undefined}
              href={item.href}
              key={item.href}
            >
              <item.icon />
              <span>{item.label}</span>
              {item.href === "/app/notifications" &&
              Boolean(notifications.data?.length) ? (
                <span className="nav-link__badge">{notifications.data?.length}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <nav className="nav-section">
        <div className="nav-label">Workspace</div>
        <Link
          className="nav-link"
          data-active={path.startsWith("/app/settings")}
          aria-current={path.startsWith("/app/settings") ? "page" : undefined}
          href="/app/settings"
        >
          <Settings />
          <span>Configurações</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="user-row">
          <span className="user-avatar">{initials}</span>
          <div className="user-row__copy">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button
            className="icon-button"
            onClick={() => void logout().then(() => router.push("/login"))}
            aria-label="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="app-root">
      {sidebar}
      {mobileOpen ? (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <header className="topbar">
          <button
            ref={mobileMenuButtonRef}
            className="icon-button topbar-menu"
            aria-label="Abrir navegação"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={17} />
          </button>
          <button className="topbar-search" onClick={() => setCommandOpen(true)}>
            <Search size={14} />
            <span>Buscar ou executar</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={
                resolvedTheme === "dark" ? "Usar tema claro" : "Usar tema escuro"
              }
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link className="icon-button notification-button" href="/app/notifications" aria-label="Notificações">
              <Bell size={16} />
              {notifications.data?.length ? <i aria-hidden="true" /> : null}
            </Link>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onClose={closeCommand} />
    </div>
  );
}
