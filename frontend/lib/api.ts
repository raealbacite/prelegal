export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const TOKEN_KEY = "prelegal.token";

/** Read the stored auth token, or null (also null during SSR/static export). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Fired when an authenticated request is rejected with 401, so the app can
 * drop a session that has become invalid (e.g. after the backend restarts and
 * rebuilds its database). */
export const UNAUTHORIZED_EVENT = "prelegal:unauthorized";

/** An error from an API call, carrying the HTTP status (0 for a network failure). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  /** Attach the stored Bearer token if present. Defaults to true. */
  auth?: boolean;
  /** Message thrown when the request never reaches the server. */
  connectionErrorMessage?: string;
}

/**
 * Call the backend API and return the parsed JSON body. Attaches the auth token
 * by default, serializes a JSON body, and throws an {@link ApiError} carrying the
 * backend's `detail` message (or a connection message) on any failure.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, connectionErrorMessage } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      connectionErrorMessage ?? "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    // An authenticated request rejected as 401 means the stored session is no
    // longer valid — drop it and let the app return to the sign-in screen.
    if (response.status === 401 && auth) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
    }

    let detail = "Something went wrong. Please try again.";
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      /* keep the default message */
    }
    throw new ApiError(detail, response.status);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) return undefined as T;
  return response.json();
}
