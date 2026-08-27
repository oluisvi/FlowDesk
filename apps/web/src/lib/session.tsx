"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, hydrateAccessToken, refreshSession, setAccessToken } from "./api";
import type { User, WorkspaceMembership } from "./types";

interface SessionContextValue {
  user: User | null;
  ready: boolean;
  workspaces: WorkspaceMembership[];
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadWorkspaces: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("flowdesk_user");
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<User>;
    return value.id && value.email && value.name ? (value as User) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [workspaceIdState, setWorkspaceIdState] = useState<string | null>(null);

  const clearLocalSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setWorkspaces([]);
    setWorkspaceIdState(null);
    localStorage.removeItem("flowdesk_user");
    localStorage.removeItem("flowdesk_workspace");
  }, []);

  const reloadWorkspaces = useCallback(async () => {
    const data = await api.get<WorkspaceMembership[]>("/workspaces");
    setWorkspaces(data);
    const stored = localStorage.getItem("flowdesk_workspace");
    const valid =
      data.find((item) => item.workspace.id === stored)?.workspace.id ??
      data[0]?.workspace.id ??
      null;
    setWorkspaceIdState(valid);
    if (valid) localStorage.setItem("flowdesk_workspace", valid);
    else localStorage.removeItem("flowdesk_workspace");
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const storedUser = readStoredUser();
      if (storedUser) setUser(storedUser);
      const token = hydrateAccessToken();
      try {
        if (!token) {
          const renewed = await refreshSession();
          if (!renewed) throw new Error("No session");
          if (renewed.user) {
            setUser(renewed.user);
            localStorage.setItem("flowdesk_user", JSON.stringify(renewed.user));
          } else if (!storedUser) {
            throw new Error("Session identity unavailable");
          }
        }
        await reloadWorkspaces();
      } catch {
        if (active) clearLocalSession();
      } finally {
        if (active) setReady(true);
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, [clearLocalSession, reloadWorkspaces]);

  const accept = async (data: { accessToken: string; user: User }) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem("flowdesk_user", JSON.stringify(data.user));
    await reloadWorkspaces();
  };

  const login = async (email: string, password: string) => {
    await accept(
      await api.post<{ accessToken: string; user: User }>("/auth/login", {
        email,
        password,
      }),
    );
  };

  const register = async (name: string, email: string, password: string) => {
    await accept(
      await api.post<{ accessToken: string; user: User }>("/auth/register", {
        name,
        email,
        password,
      }),
    );
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Local state is cleared regardless: a revoked/expired access token should
      // never trap the user inside the UI.
    }
    clearLocalSession();
  };

  const setWorkspaceId = (id: string) => {
    setWorkspaceIdState(id);
    localStorage.setItem("flowdesk_workspace", id);
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      ready,
      workspaces,
      workspaceId: workspaceIdState,
      setWorkspaceId,
      login,
      register,
      logout,
      reloadWorkspaces,
    }),
    [user, ready, workspaces, workspaceIdState, reloadWorkspaces],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be inside SessionProvider");
  return value;
}
