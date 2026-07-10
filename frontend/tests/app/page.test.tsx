import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { AuthProvider } from "@/lib/authContext";

function renderHome() {
  return render(
    <AuthProvider>
      <Home />
    </AuthProvider>,
  );
}

describe("Home", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the auth screen when signed out", async () => {
    renderHome();

    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /legal document creator/i }),
    ).not.toBeInTheDocument();
  });

  it("signs in and reveals the document creator", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ token: "tok", user: { id: 1, email: "jane@example.com" } }),
      })) as unknown as typeof fetch,
    );

    renderHome();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByRole("heading", { name: /legal document creator/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
