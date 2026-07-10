import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken, setToken } from "@/lib/api";
import { fetchCurrentUser, signIn, signOut, signUp } from "@/lib/auth";

function stubFetch(impl: (url: string, options?: { method?: string }) => Promise<unknown>) {
  vi.stubGlobal("fetch", vi.fn(impl) as unknown as typeof fetch);
}

describe("auth", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("signUp stores the returned token and returns the user", async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ token: "tok", user: { id: 1, email: "a@b.com" } }),
    }));

    const user = await signUp("a@b.com", "supersecret");

    expect(user).toEqual({ id: 1, email: "a@b.com" });
    expect(getToken()).toBe("tok");
  });

  it("signIn stores the returned token and returns the user", async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ token: "tok2", user: { id: 2, email: "c@d.com" } }),
    }));

    const user = await signIn("c@d.com", "supersecret");

    expect(user.email).toBe("c@d.com");
    expect(getToken()).toBe("tok2");
  });

  it("fetchCurrentUser returns null and skips the network when there is no token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    expect(await fetchCurrentUser()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchCurrentUser returns the user for a valid token", async () => {
    setToken("tok");
    stubFetch(async () => ({ ok: true, json: async () => ({ id: 5, email: "e@f.com" }) }));

    expect(await fetchCurrentUser()).toEqual({ id: 5, email: "e@f.com" });
  });

  it("fetchCurrentUser clears an invalid token", async () => {
    setToken("bad");
    stubFetch(async () => ({ ok: false, json: async () => ({ detail: "Invalid or expired token." }) }));

    expect(await fetchCurrentUser()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("signOut clears the stored token", () => {
    setToken("tok");
    signOut();
    expect(getToken()).toBeNull();
  });
});
