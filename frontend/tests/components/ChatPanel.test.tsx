import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChatPanel from "@/components/ChatPanel";
import { createDefaultFormData } from "@/lib/ndaDefaults";
import { NDAFormData } from "@/lib/types";

function ControlledChatPanel({ onChange }: { onChange?: (data: NDAFormData) => void }) {
  const [data, setData] = useState(() => createDefaultFormData());
  return (
    <ChatPanel
      data={data}
      onChange={(next) => {
        setData(next);
        onChange?.(next);
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
    expect(screen.getByText(/I'll help you put together a Mutual NDA/i)).toBeInTheDocument();
  });

  it("sends a message, renders the reply, and merges fields into the document", async () => {
    const user = userEvent.setup();
    mockFetchOnce({
      reply: "Great — I've noted Acme Corp as Party A.",
      fields: { partyA: { companyName: "Acme Corp" } },
    });
    const onChange = vi.fn();

    render(<ControlledChatPanel onChange={onChange} />);

    await user.type(screen.getByLabelText("Message"), "Party A is Acme Corp");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/noted Acme Corp as Party A/i)).toBeInTheDocument();
    expect(screen.getByText("Party A is Acme Corp")).toBeInTheDocument();

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
    const lastData = onChange.mock.calls.at(-1)![0];
    expect(lastData.partyA.companyName).toBe("Acme Corp");
  });

  it("shows a graceful error when the assistant is unavailable", async () => {
    const user = userEvent.setup();
    mockFetchOnce({ detail: "The AI assistant is not configured." }, false);

    render(<ControlledChatPanel />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/not configured/i)).toBeInTheDocument();
  });

  it("does not send an empty message", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce({ reply: "hi", fields: {} });

    render(<ControlledChatPanel />);

    await user.type(screen.getByLabelText("Message"), "   ");
    // The send button is disabled for whitespace-only input.
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
