import { ConfidentialityTermType, MndaTermType, NDAFormData, PartyInfo } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type PartyPatch = Partial<Record<keyof PartyInfo, string | null>>;

/**
 * A per-turn patch of NDA fields returned by the assistant. Every field is
 * optional/nullable; anything null or omitted leaves the current value alone.
 * Mirrors the backend `NdaFieldsPatch`.
 */
export interface NdaFieldsPatch {
  partyA?: PartyPatch | null;
  partyB?: PartyPatch | null;
  purpose?: string | null;
  effectiveDate?: string | null;
  mndaTermType?: MndaTermType | null;
  mndaTermDuration?: string | null;
  confidentialityTermType?: ConfidentialityTermType | null;
  confidentialityTermDuration?: string | null;
  governingLaw?: string | null;
  jurisdiction?: string | null;
  modifications?: string | null;
}

export interface ChatApiResponse {
  reply: string;
  fields: NdaFieldsPatch;
}

const PARTY_KEYS: (keyof NDAFormData)[] = ["partyA", "partyB"];
const SCALAR_KEYS: (keyof NdaFieldsPatch)[] = [
  "purpose",
  "effectiveDate",
  "mndaTermType",
  "mndaTermDuration",
  "confidentialityTermType",
  "confidentialityTermDuration",
  "governingLaw",
  "jurisdiction",
  "modifications",
];

/**
 * Apply an assistant field patch onto the current NDA form data. Only string
 * values are applied, so a null/omitted field never wipes a value the user has
 * already provided.
 */
export function mergeFieldsPatch(current: NDAFormData, patch: NdaFieldsPatch): NDAFormData {
  const next: NDAFormData = {
    ...current,
    partyA: { ...current.partyA },
    partyB: { ...current.partyB },
  };

  for (const party of PARTY_KEYS as ("partyA" | "partyB")[]) {
    const partyPatch = patch[party];
    if (!partyPatch) continue;
    for (const key of Object.keys(partyPatch) as (keyof PartyInfo)[]) {
      const value = partyPatch[key];
      if (typeof value === "string") next[party][key] = value;
    }
  }

  const mutable = next as unknown as Record<string, unknown>;
  for (const key of SCALAR_KEYS) {
    const value = patch[key];
    if (typeof value === "string") mutable[key] = value;
  }

  return next;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * Send the conversation so far plus the current field state to the backend and
 * return the assistant's reply and field patch. Throws with a user-facing
 * message if the request fails.
 */
export async function sendChat(
  messages: ChatMessage[],
  fields: NDAFormData,
): Promise<ChatApiResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, fields }),
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
