import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocumentCreator from "@/components/DocumentCreator";

const toBlob = vi.fn(async () => new Blob(["fake-pdf"], { type: "application/pdf" }));

vi.mock(import("@react-pdf/renderer"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, pdf: (() => ({ toBlob })) as unknown as typeof actual.pdf };
});

const CSA_DOC = {
  filename: "csa.md",
  name: "Cloud Service Agreement (CSA)",
  description: "…",
  variables: [{ name: "Customer" }, { name: "Provider" }, { name: "Subscription Period" }],
  markdown:
    '# Cloud Service Agreement\n\n1. <span class="header_2" id="1">Service</span>\n    1. <span class="coverpage_link">Customer</span> uses the service from <span class="coverpage_link">Provider</span> during the <span class="orderform_link">Subscription Period</span>.',
};

// One MNDA chat turn that fills everything isFormComplete requires (purpose and
// term durations have defaults via the adapter).
const MNDA_TURN = {
  reply: "All set — your Mutual NDA is ready to download.",
  documentType: "mutual-nda.md",
  fields: {
    "partyA.companyName": "Acme Corp",
    "partyB.companyName": "Globex Inc",
    effectiveDate: "2026-07-08",
    governingLaw: "Delaware",
    jurisdiction: "New Castle County, Delaware",
  },
};

const CSA_TURN = {
  reply: "Great — let's draft a Cloud Service Agreement. Who is the Provider?",
  documentType: "csa.md",
  fields: { Customer: "Acme Corp" },
};

let chatQueue: unknown[] = [];

function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/documents/")) {
        return { ok: true, json: async () => CSA_DOC };
      }
      // /api/chat
      return { ok: true, json: async () => chatQueue.shift() };
    }) as unknown as typeof fetch,
  );
}

async function send(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

describe("DocumentCreator", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    toBlob.mockClear();
    chatQueue = [];
    installFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a placeholder before any document is chosen", () => {
    render(<DocumentCreator />);
    expect(screen.getByText(/preview will appear here/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it("drafts a Mutual NDA with the bespoke renderer and enables download when complete", async () => {
    const user = userEvent.setup();
    chatQueue = [MNDA_TURN];
    render(<DocumentCreator />);

    await send(user, "I need a mutual NDA with all the details");

    // The bespoke NDA preview renders.
    expect(await screen.findByText("Mutual Non-Disclosure Agreement")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Corp").length).toBeGreaterThan(0);

    const downloadButton = screen.getByRole("button", { name: /download pdf/i });
    await waitFor(() => expect(downloadButton).toBeEnabled());

    await user.click(downloadButton);
    expect(toBlob).toHaveBeenCalledTimes(1);
  });

  it("drafts a non-NDA document with the generic renderer", async () => {
    const user = userEvent.setup();
    chatQueue = [CSA_TURN];
    render(<DocumentCreator />);

    await send(user, "I need a cloud service agreement");

    // The generic preview renders the fetched template with filled + placeholder values.
    expect(await screen.findByText("Cloud Service Agreement (CSA)")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Acme Corp/)).toBeInTheDocument());

    // Not all fields are filled, so download stays disabled with a hint.
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    expect(screen.getByText(/fields still needed/i)).toBeInTheDocument();
  });
});
