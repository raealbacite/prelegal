import { DocumentTemplate } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const cache = new Map<string, DocumentTemplate>();

/**
 * Fetch a supported document's metadata, field list, and raw template. Cached
 * per filename for the session, since templates never change while running.
 */
export async function fetchDocumentTemplate(filename: string): Promise<DocumentTemplate> {
  const cached = cache.get(filename);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(filename)}`);
  } catch {
    throw new Error("Couldn't load the document template. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new Error(`Couldn't load the document template (${filename}).`);
  }

  const doc: DocumentTemplate = await response.json();
  cache.set(filename, doc);
  return doc;
}
