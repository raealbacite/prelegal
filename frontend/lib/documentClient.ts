import { apiFetch } from "./api";
import { DocumentTemplate } from "./types";

const cache = new Map<string, DocumentTemplate>();

/**
 * Fetch a supported document's metadata, field list, and raw template. Cached
 * per filename for the session, since templates never change while running.
 */
export async function fetchDocumentTemplate(filename: string): Promise<DocumentTemplate> {
  const cached = cache.get(filename);
  if (cached) return cached;

  let doc: DocumentTemplate;
  try {
    doc = await apiFetch<DocumentTemplate>(`/api/templates/${encodeURIComponent(filename)}`, {
      auth: false,
    });
  } catch {
    throw new Error(`Couldn't load the document template (${filename}).`);
  }
  cache.set(filename, doc);
  return doc;
}
