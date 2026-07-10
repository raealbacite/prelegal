"use client";

import { useEffect, useState } from "react";
import { deleteDocument, getDocument, listDocuments } from "@/lib/documentsStore";
import { DocumentDetail, DocumentSummary } from "@/lib/types";

interface DocumentsHistoryProps {
  /** Open a saved document back in the creator. */
  onOpen: (doc: DocumentDetail) => void;
  /** Start a brand-new document. */
  onNew: () => void;
}

export default function DocumentsHistory({ onOpen, onNew }: DocumentsHistoryProps) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDocuments()
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load your documents.");
          setDocuments([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOpen(id: number) {
    setBusyId(id);
    setError(null);
    try {
      onOpen(await getDocument(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that document.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await deleteDocument(id);
      setDocuments((prev) => (prev ? prev.filter((doc) => doc.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that document.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy dark:text-zinc-50">My Documents</h1>
          <p className="text-sm text-gray-text">
            Documents you&apos;ve saved this session. Open one to keep editing, or start a new one.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="shrink-0 rounded-full bg-purple-secondary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          New Document
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {documents === null ? (
        <p className="text-sm text-gray-text">Loading your documents…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-sm text-gray-text">
            You haven&apos;t saved any documents yet. Create one and hit Save to see it here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-navy dark:text-zinc-100">{doc.title}</p>
                <p className="text-xs text-gray-text">
                  {friendlyType(doc.documentType)} · Updated {formatDate(doc.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpen(doc.id)}
                  disabled={busyId === doc.id}
                  className="rounded-full bg-blue-primary px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={busyId === doc.id}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-gray-text transition hover:text-red-600 disabled:opacity-50 dark:border-zinc-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Turn a template filename (e.g. "cloud-service-agreement.md") into a label. */
function friendlyType(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Format the backend "YYYY-MM-DD HH:MM:SS" (UTC) timestamp for display. */
function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
