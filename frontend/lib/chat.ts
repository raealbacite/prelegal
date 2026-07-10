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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, documentType, fields }),
    });
  } catch {
    throw new Error("Couldn't reach the assistant. Check your connection and try again.");
  }

  if (!response.ok) {
    let detail = "The assistant is unavailable right now. Please try again.";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* keep the default message */
    }
    throw new Error(detail);
  }

  return response.json();
}
