import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChatPanel from "@/components/ChatPanel";
import { ChatTurnResult, mergeFields } from "@/lib/chat";
import { FieldsBag } from "@/lib/types";

function ControlledChatPanel({ onResult }: { onResult?: (r: ChatTurnResult) => void }) {
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldsBag>({});
  return (
    <ChatPanel
      documentType={documentType}
      fields={fields}
      onResult={(result) => {
        setFields((prev) => mergeFields(prev, result.fields));
        if (result.documentType) setDocumentType(result.documentType);
        onResult?.(result);
      }}
    />
  );
}

function mockFetchOnce(response: unknown, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => response }));
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return fetchMock;
}

describe("ChatPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the opening greeting", () => {
    render(<ControlledChatPanel />);
    expect(screen.getByText(/help you draft a legal agreement/i)).toBeInTheDocument();
  });

  it("sends a message, renders the reply, and reports the result", async () => {
    const user = userEvent.setup();
    mockFetchOnce({
      reply: "Great — let's draft a Cloud Service Agreement. Who is the Provider?",
      documentType: "csa.md",
      fields: { Customer: "Acme Corp" },
    });
    const onResult = vi.fn();

    render(<ControlledChatPanel onResult={onResult} />);

    await user.type(screen.getByLabelText("Message"), "I need a cloud service agreement");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/who is the Provider/i)).toBeInTheDocument();
    expect(screen.getByText("I need a cloud service agreement")).toBeInTheDocument();

    await waitFor(() => expect(onResult).toHaveBeenCalled());
    const result = onResult.mock.calls.at(-1)![0];
    expect(result.documentType).toBe("csa.md");
    expect(result.fields.Customer).toBe("Acme Corp");
  });

  it("returns focus to the input after the assistant replies", async () => {
    const user = userEvent.setup();
    mockFetchOnce({ reply: "Got it — what's next?", documentType: null, fields: {} });

    render(<ControlledChatPanel />);

    const input = screen.getByLabelText("Message");
    await user.type(input, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await screen.findByText(/what's next/i);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("shows a graceful error when the assistant is unavailable", async () => {
    const user = userEvent.setup();
    mockFetchOnce({ detail: "The AI assistant is not configured." }, false);

    render(<ControlledChatPanel />);

    const input = screen.getByLabelText("Message");
    await user.type(input, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/not configured/i)).toBeInTheDocument();
    // Focus returns to the input so the user can retry after an error.
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("does not send an empty message", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce({ reply: "hi", documentType: null, fields: {} });

    render(<ControlledChatPanel />);

    await user.type(screen.getByLabelText("Message"), "   ");
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
