// Keep browser requests same-origin. Next.js proxies this route to the API,
// allowing the strict HTTP-only refresh cookie to remain first-party in
// production while preserving the same security model locally.
const API_URL = "/api/v1";

let accessToken: string | null = null;
let refreshing: Promise<{ accessToken: string; user?: SessionUser } | null> | null = null;

interface SessionUser {
  id: string;
  name: string;
  email: string;
}

interface ErrorPayload {
  error?: {
    message?: string;
    code?: string;
    fields?: Record<string, string>;
    correlationId?: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fields?: Record<string, string>,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string | null) {
  // Access JWTs intentionally live only in memory. A page reload obtains a new
  // short-lived token through the strict HTTP-only refresh cookie, reducing the
  // persistence window available to an XSS bug.
  accessToken = token;
}

export function hydrateAccessToken() {
  if (typeof window !== "undefined") {
    // Clean up tokens persisted by pre-release builds.
    sessionStorage.removeItem("flowdesk_access");
  }
  return accessToken;
}

async function refresh(): Promise<{ accessToken: string; user?: SessionUser } | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        setAccessToken(null);
        return null;
      }
      const data = (await response.json()) as {
        accessToken: string;
        user?: SessionUser;
      };
      setAccessToken(data.accessToken);
      return data;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  hydrateAccessToken();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto &&
    !headers.has("x-correlation-id")
  ) {
    headers.set("x-correlation-id", crypto.randomUUID());
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao FlowDesk API.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 401 && retry) {
    const renewed = await refresh();
    if (renewed) return request<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    let payload: ErrorPayload = {};
    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      // A normalized fallback below keeps the UI stable even for proxy errors.
    }
    throw new ApiError(
      payload.error?.message ?? "A solicitação não pôde ser concluída.",
      response.status,
      payload.error?.code ?? `HTTP_${response.status}`,
      payload.error?.fields,
      payload.error?.correlationId ?? response.headers.get("x-correlation-id") ?? undefined,
    );
  }
  return response.json() as Promise<T>;
}

export async function refreshSession() {
  return refresh();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};
