import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocumentsHistory from "@/components/DocumentsHistory";

const SUMMARY = {
  id: 1,
  title: "Acme MNDA",
  documentType: "mutual-nda.md",
  createdAt: "2026-07-10 05:00:00",
  updatedAt: "2026-07-10 05:00:00",
};
const DETAIL = { ...SUMMARY, fields: { partyACompanyName: "Acme" } };

let listResponse: unknown[] = [];

function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: { method?: string }) => {
      const method = options?.method ?? "GET";
      if (url === "/api/documents" && method === "GET") {
        return { ok: true, json: async () => listResponse };
      }
      if (url === "/api/documents/1" && method === "GET") {
        return { ok: true, json: async () => DETAIL };
      }
      if (url === "/api/documents/1" && method === "DELETE") {
        return { ok: true, status: 204, json: async () => ({}) };
      }
      return { ok: false, status: 404, json: async () => ({ detail: "not found" }) };
    }) as unknown as typeof fetch,
  );
}

describe("DocumentsHistory", () => {
  beforeEach(() => {
    window.localStorage.clear();
    listResponse = [];
    installFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state when there are no saved documents", async () => {
    render(<DocumentsHistory onOpen={vi.fn()} onNew={vi.fn()} />);
    expect(await screen.findByText(/haven't saved any documents yet/i)).toBeInTheDocument();
  });

  it("lists saved documents and opens one with its full detail", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    listResponse = [SUMMARY];

    render(<DocumentsHistory onOpen={onOpen} onNew={vi.fn()} />);

    expect(await screen.findByText("Acme MNDA")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open/i }));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(DETAIL));
  });

  it("deletes a document and removes it from the list", async () => {
    const user = userEvent.setup();
    listResponse = [SUMMARY];

    render(<DocumentsHistory onOpen={vi.fn()} onNew={vi.fn()} />);

    expect(await screen.findByText("Acme MNDA")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(screen.queryByText("Acme MNDA")).not.toBeInTheDocument());
  });
});
