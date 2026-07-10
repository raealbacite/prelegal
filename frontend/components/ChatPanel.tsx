"use client";

import { useEffect, useRef, useState } from "react";
import { FieldsBag } from "@/lib/types";
import { ChatMessage, ChatTurnResult, sendChat } from "@/lib/chat";

interface ChatPanelProps {
  documentType: string | null;
  fields: FieldsBag;
  onResult: (result: ChatTurnResult) => void;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you draft a legal agreement. Tell me what you're trying to do — for example a mutual NDA, a cloud service agreement, or a data processing agreement — and I'll figure out the right document and fill it in with you.",
};

export default function ChatPanel({ documentType, fields, onResult }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasSent = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  // Return focus to the input once a turn finishes (the textarea is disabled
  // while sending, so we wait for the re-enable render rather than focusing in
  // handleSubmit). Covers both success and error, so the user can keep typing.
  useEffect(() => {
    if (!isSending && hasSent.current) inputRef.current?.focus();
  }, [isSending]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const conversation: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(conversation);
    setInput("");
    setError(null);
    setIsSending(true);
    hasSent.current = true;

    try {
      const result = await sendChat(conversation, documentType, fields);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-lg border border-zinc-300 dark:border-zinc-700">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}
        {isSending ? (
          <p className="self-start text-xs text-zinc-500 dark:text-zinc-400">Assistant is typing…</p>
        ) : null}
      </div>

      {error ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-zinc-300 p-3 dark:border-zinc-700">
        <textarea
          ref={inputRef}
          aria-label="Message"
          className="min-h-[2.5rem] w-full resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          rows={1}
          value={input}
          placeholder="Tell the assistant about your agreement…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="shrink-0 rounded-full bg-purple-secondary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
        isUser
          ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "self-start bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
      }`}
    >
      {message.content}
    </div>
  );
}
