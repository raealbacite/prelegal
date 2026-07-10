import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, getToken, setToken, UNAUTHORIZED_EVENT } from "@/lib/api";

describe("apiFetch", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the Bearer token on authenticated calls", async () => {
    setToken("tok");
    const mock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal("fetch", mock as unknown as typeof fetch);

    await apiFetch("/api/documents");

    const [, options] = mock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(options.headers.Authorization).toBe("Bearer tok");
  });

  it("returns undefined for a 204 response", async () => {
    setToken("tok");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) })) as unknown as typeof fetch,
    );

    await expect(apiFetch("/api/documents/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("clears the token and dispatches an unauthorized event on a 401 to an authed call", async () => {
    setToken("stale");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ detail: "nope" }) })) as unknown as typeof fetch,
    );
    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    await expect(apiFetch("/api/documents")).rejects.toThrow("nope");

    expect(getToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  });

  it("does not sign out on a 401 from an unauthenticated call (e.g. bad login)", async () => {
    setToken("keep");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ detail: "bad creds" }) })) as unknown as typeof fetch,
    );
    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    await expect(apiFetch("/api/auth/login", { method: "POST", body: {}, auth: false })).rejects.toThrow(
      "bad creds",
    );

    expect(getToken()).toBe("keep");
    expect(onUnauthorized).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  });
});
