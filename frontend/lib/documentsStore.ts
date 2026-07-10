import { apiFetch } from "./api";
import { DocumentDetail, DocumentSummary, FieldsBag } from "./types";

export interface SaveDocumentInput {
  title: string;
  documentType: string;
  fields: FieldsBag;
}

/** List the signed-in user's saved documents, newest first. */
export function listDocuments(): Promise<DocumentSummary[]> {
  return apiFetch<DocumentSummary[]>("/api/documents");
}

/** Persist a generated document and return it with its assigned id. */
export function saveDocument(input: SaveDocumentInput): Promise<DocumentDetail> {
  return apiFetch<DocumentDetail>("/api/documents", { method: "POST", body: input });
}

/** Fetch one saved document (with field values) so it can be re-opened. */
export function getDocument(id: number): Promise<DocumentDetail> {
  return apiFetch<DocumentDetail>(`/api/documents/${id}`);
}

/** Delete one of the signed-in user's saved documents. */
export function deleteDocument(id: number): Promise<void> {
  return apiFetch<void>(`/api/documents/${id}`, { method: "DELETE" });
}
