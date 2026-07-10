import { apiFetch, clearToken, getToken, setToken } from "./api";
import { User } from "./types";

interface AuthResponse {
  token: string;
  user: User;
}

/** Register a new account, store the returned token, and return the user. */
export async function signUp(email: string, password: string): Promise<User> {
  const result = await apiFetch<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setToken(result.token);
  return result.user;
}

/** Sign in to an existing account, store the returned token, and return the user. */
export async function signIn(email: string, password: string): Promise<User> {
  const result = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setToken(result.token);
  return result.user;
}

/**
 * Resolve the current user from a stored token, or null if there is no token or
 * it is no longer valid. Clears an invalid token so we don't keep retrying it.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    return await apiFetch<User>("/api/auth/me");
  } catch {
    clearToken();
    return null;
  }
}

/** Sign out by discarding the stored token (JWTs are stateless server-side). */
export function signOut(): void {
  clearToken();
}
