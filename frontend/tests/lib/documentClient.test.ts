import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDocumentTemplate } from "@/lib/documentClient";

const DOC = {
  filename: "csa.md",
  name: "Cloud Service Agreement (CSA)",
  description: "…",
  variables: [{ name: "Customer" }],
  markdown: "# Cloud Service Agreement",
};

describe("fetchDocumentTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a document template and caches it per filename", async () => {
    let calledUrl = "";
    const fetchMock = vi.fn(async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => DOC };
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const first = await fetchDocumentTemplate("csa.md");
    const second = await fetchDocumentTemplate("csa.md");

    expect(first).toEqual(DOC);
    expect(second).toEqual(DOC);
    // Second call served from cache — fetch only happened once.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrl).toBe("/api/documents/csa.md");
  });

  it("throws a friendly error on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch,
    );
    await expect(fetchDocumentTemplate("missing.md")).rejects.toThrow(/Couldn't load/);
  });
});
