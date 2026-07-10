import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeFields, sendChat } from "@/lib/chat";

describe("mergeFields", () => {
  it("overlays non-blank patch values onto the current bag", () => {
    const merged = mergeFields({ Customer: "Acme" }, { Provider: "Globex" });
    expect(merged).toEqual({ Customer: "Acme", Provider: "Globex" });
  });

  it("keeps existing values for keys not in the patch", () => {
    const merged = mergeFields({ Customer: "Acme" }, { Provider: "Globex" });
    expect(merged.Customer).toBe("Acme");
  });

  it("ignores blank patch values", () => {
    const merged = mergeFields({ Customer: "Acme" }, { Customer: "   " });
    expect(merged.Customer).toBe("Acme");
  });

  it("does not mutate the original bag", () => {
    const current = { Customer: "Acme" };
    mergeFields(current, { Provider: "Globex" });
    expect(current).toEqual({ Customer: "Acme" });
  });
});

describe("sendChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts messages, document type, and fields and returns the parsed response", async () => {
    const apiResponse = {
      reply: "Got it.",
      documentType: "csa.md",
      fields: { Customer: "Acme Corp" },
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => apiResponse,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendChat(
      [{ role: "user", content: "cloud service agreement please" }],
      "csa.md",
      { Customer: "Acme Corp" },
    );

    expect(result).toEqual(apiResponse);
    const [url, options] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toBe("cloud service agreement please");
    expect(body.documentType).toBe("csa.md");
    expect(body.fields).toEqual({ Customer: "Acme Corp" });
  });

  it("throws the backend detail message on an error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ detail: "The AI assistant is not configured." }),
      })) as unknown as typeof fetch,
    );

    await expect(sendChat([{ role: "user", content: "hi" }], null, {})).rejects.toThrow(
      "The AI assistant is not configured.",
    );
  });

  it("throws a connection error when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );

    await expect(sendChat([{ role: "user", content: "hi" }], null, {})).rejects.toThrow(
      /Couldn't reach the assistant/,
    );
  });
});
