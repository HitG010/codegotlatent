import type { SessionUser } from "@cgl/shared";

/** Unset in the prototype build, which runs on sample data. */
export const API_URL: string | undefined = import.meta.env.VITE_API_URL || undefined;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface SignedIn {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

// The access token lives only in memory; the session cookie restores it after a reload
let accessToken: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshing: Promise<SessionUser | null> | null = null;

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_URL) throw new Error("No API configured");
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
}

async function fail(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ApiError(res.status, body?.error?.code ?? "unknown", body?.error?.message ?? "Something went wrong");
}

function adopt(session: SignedIn): SessionUser {
  accessToken = session.accessToken;
  clearTimeout(refreshTimer);
  // Renew a minute early so requests never meet an expired token
  refreshTimer = setTimeout(() => void refreshSession(), Math.max(10, session.expiresIn - 60) * 1000);
  return session.user;
}

/** Restores or renews the session from its cookie. Concurrent callers share one request. */
export function refreshSession(): Promise<SessionUser | null> {
  refreshing ??= send("/auth/refresh", { method: "POST" })
    .then(async (res) => {
      if (res.ok) return adopt((await res.json()) as SignedIn);
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function signInWithGoogle(credential: string): Promise<SessionUser> {
  const res = await send("/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
  if (!res.ok) await fail(res);
  return adopt((await res.json()) as SignedIn);
}

export async function signOut(): Promise<void> {
  clearTimeout(refreshTimer);
  accessToken = null;
  await send("/auth/logout", { method: "POST" }).catch(() => undefined);
}

/** A JSON request to the API. An expired access token is renewed once and the request retried. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && (await refreshSession())) res = await send(path, init);
  if (!res.ok) await fail(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
