import { apiFetch } from "./api";
import { FieldsBag } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The result of one chat turn: the assistant's reply, the document type it has
 * settled on (or null while still deciding), and a patch of field values.
 * Mirrors the backend `ChatResponse`.
 */
export interface ChatTurnResult {
  reply: string;
  documentType: string | null;
  fields: FieldsBag;
}

/**
 * Apply an assistant field patch onto the current field bag. The backend only
 * ever returns confirmed, non-blank values, so a simple overlay is enough — a
 * key never present in the patch keeps its existing value.
 */
export function mergeFields(current: FieldsBag, patch: FieldsBag): FieldsBag {
  const next: FieldsBag = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "string" && value.trim()) next[key] = value;
  }
  return next;
}

/**
 * Send the conversation so far, the current document type, and the collected
 * fields to the backend, and return the assistant's reply, resolved document
 * type, and field patch. Throws with a user-facing message if the request fails.
 */
export async function sendChat(
  messages: ChatMessage[],
  documentType: string | null,
  fields: FieldsBag,
): Promise<ChatTurnResult> {
  return apiFetch<ChatTurnResult>("/api/chat", {
    method: "POST",
    body: { messages, documentType, fields },
    connectionErrorMessage: "Couldn't reach the assistant. Check your connection and try again.",
  });
}
