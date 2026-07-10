import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NdaCreator from "@/components/NdaCreator";

const toBlob = vi.fn(async () => new Blob(["fake-pdf"], { type: "application/pdf" }));

vi.mock(import("@react-pdf/renderer"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, pdf: () => ({ toBlob }) };
});

// A single chat turn that fills every field required to enable the download.
// (purpose and the term durations already have non-empty defaults.)
const COMPLETING_PATCH = {
  reply: "All set — your NDA is ready to download.",
  fields: {
    partyA: { companyName: "Acme Corp" },
    partyB: { companyName: "Globex Inc" },
    effectiveDate: "2026-07-08",
    governingLaw: "Delaware",
    jurisdiction: "the state and federal courts located in New Castle County, Delaware",
  },
};

async function completeViaChat(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Message"), "Here are all the details");
  await user.click(screen.getByRole("button", { name: /send/i }));
  await screen.findByText(/ready to download/i);
}

describe("NdaCreator", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    toBlob.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => COMPLETING_PATCH })) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the download button disabled until the chat fills the required fields", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    const downloadButton = screen.getByRole("button", { name: /download pdf/i });
    expect(downloadButton).toBeDisabled();

    await completeViaChat(user);

    await waitFor(() => expect(downloadButton).toBeEnabled());
  });

  it("generates and downloads a PDF once the chat has completed the document", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    await completeViaChat(user);

    const downloadButton = screen.getByRole("button", { name: /download pdf/i });
    await waitFor(() => expect(downloadButton).toBeEnabled());
    await user.click(downloadButton);

    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
