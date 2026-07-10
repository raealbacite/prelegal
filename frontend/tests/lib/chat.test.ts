import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeFieldsPatch, sendChat } from "@/lib/chat";
import { createDefaultFormData } from "@/lib/ndaDefaults";

describe("mergeFieldsPatch", () => {
  it("applies scalar and nested party values", () => {
    const current = createDefaultFormData();
    const merged = mergeFieldsPatch(current, {
      partyA: { companyName: "Acme Corp" },
      governingLaw: "Delaware",
    });

    expect(merged.partyA.companyName).toBe("Acme Corp");
    expect(merged.governingLaw).toBe("Delaware");
  });

  it("ignores null and omitted fields so existing values survive", () => {
    const current = createDefaultFormData();
    current.governingLaw = "Delaware";

    const merged = mergeFieldsPatch(current, {
      governingLaw: null,
      partyA: null,
      jurisdiction: "New Castle County, Delaware",
    });

    expect(merged.governingLaw).toBe("Delaware");
    expect(merged.jurisdiction).toBe("New Castle County, Delaware");
  });

  it("merges only the provided party keys and preserves the rest", () => {
    const current = createDefaultFormData();
    current.partyA.companyName = "Acme Corp";

    const merged = mergeFieldsPatch(current, {
      partyA: { printName: "Jane Doe", title: null },
    });

    expect(merged.partyA.companyName).toBe("Acme Corp");
    expect(merged.partyA.printName).toBe("Jane Doe");
    expect(merged.partyA.title).toBe("");
  });

  it("does not mutate the original data", () => {
    const current = createDefaultFormData();
    mergeFieldsPatch(current, { partyA: { companyName: "Acme Corp" } });
    expect(current.partyA.companyName).toBe("");
  });

  it("applies term-type enum values", () => {
    const current = createDefaultFormData();
    const merged = mergeFieldsPatch(current, {
      confidentialityTermType: "perpetual",
    });
    expect(merged.confidentialityTermType).toBe("perpetual");
  });
});

describe("sendChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts messages and fields and returns the parsed response", async () => {
    const apiResponse = {
      reply: "Got it.",
      fields: { partyA: { companyName: "Acme Corp" } },
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => apiResponse,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    const data = createDefaultFormData();
    const result = await sendChat([{ role: "user", content: "Party A is Acme Corp" }], data);

    expect(result).toEqual(apiResponse);
    const [url, options] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toBe("Party A is Acme Corp");
    expect(body.fields).toEqual(data);
  });

  it("throws the backend detail message on an error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ detail: "The AI assistant is not configured." }),
      })) as unknown as typeof fetch,
    );

    await expect(
      sendChat([{ role: "user", content: "hi" }], createDefaultFormData()),
    ).rejects.toThrow("The AI assistant is not configured.");
  });

  it("throws a connection error when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );

    await expect(
      sendChat([{ role: "user", content: "hi" }], createDefaultFormData()),
    ).rejects.toThrow(/Couldn't reach the assistant/);
  });
});
