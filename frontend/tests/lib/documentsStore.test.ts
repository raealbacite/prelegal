import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "@/lib/api";
import {
  deleteDocument,
  getDocument,
  listDocuments,
  saveDocument,
} from "@/lib/documentsStore";

type FetchMock = ReturnType<typeof vi.fn>;

function stubFetch(response: unknown, ok = true, status = 200): FetchMock {
  const mock = vi.fn(async () => ({ ok, status, json: async () => response }));
  vi.stubGlobal("fetch", mock as unknown as typeof fetch);
  return mock;
}

function lastCall(mock: FetchMock) {
  const [url, options] = mock.mock.calls[mock.mock.calls.length - 1];
  return { url, options: options ?? {} };
}

describe("documentsStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setToken("tok"); // authenticated calls attach a Bearer token
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listDocuments GETs /api/documents with the auth header", async () => {
    const mock = stubFetch([{ id: 1, title: "Doc" }]);
    const result = await listDocuments();

    expect(result).toEqual([{ id: 1, title: "Doc" }]);
    const { url, options } = lastCall(mock);
    expect(url).toBe("/api/documents");
    expect((options.method ?? "GET")).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer tok");
  });

  it("saveDocument POSTs the payload to /api/documents", async () => {
    const mock = stubFetch({ id: 7 }, true, 201);
    await saveDocument({ title: "Acme MNDA", documentType: "mutual-nda.md", fields: { a: "b" } });

    const { url, options } = lastCall(mock);
    expect(url).toBe("/api/documents");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      title: "Acme MNDA",
      documentType: "mutual-nda.md",
      fields: { a: "b" },
    });
  });

  it("getDocument GETs the document by id", async () => {
    const mock = stubFetch({ id: 3, fields: {} });
    await getDocument(3);
    expect(lastCall(mock).url).toBe("/api/documents/3");
  });

  it("deleteDocument DELETEs the document by id", async () => {
    const mock = stubFetch({}, true, 204);
    await deleteDocument(9);
    const { url, options } = lastCall(mock);
    expect(url).toBe("/api/documents/9");
    expect(options.method).toBe("DELETE");
  });
});
