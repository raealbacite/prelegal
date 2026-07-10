"use client";

import { useState } from "react";
import AppHeader, { type AppView } from "./AppHeader";
import DocumentCreator from "./DocumentCreator";
import DocumentsHistory from "./DocumentsHistory";
import { DocumentDetail, FieldsBag } from "@/lib/types";

/** Seed for the creator, plus a key that forces a remount when it changes so a
 * re-opened or new document starts from a clean component state. */
interface CreatorSeed {
  key: number;
  documentType: string | null;
  fields: FieldsBag;
}

export default function AppShell() {
  const [view, setView] = useState<AppView>("create");
  const [seed, setSeed] = useState<CreatorSeed>({ key: 0, documentType: null, fields: {} });

  function newDocument() {
    setSeed((prev) => ({ key: prev.key + 1, documentType: null, fields: {} }));
    setView("create");
  }

  function openDocument(doc: DocumentDetail) {
    setSeed((prev) => ({ key: prev.key + 1, documentType: doc.documentType, fields: doc.fields }));
    setView("create");
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        view={view}
        onNewDocument={newDocument}
        onShowHistory={() => setView("history")}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        {/* The creator stays mounted while the history view is open so an
            in-progress, unsaved draft isn't lost when peeking at saved docs. */}
        <div className={view === "history" ? "hidden" : "flex flex-col gap-6"}>
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-navy dark:text-zinc-50">
              Legal Document Creator
            </h1>
            <p className="text-sm text-gray-text">
              Chat with the assistant to draft a legal agreement from the Common Paper standard
              templates. Tell it what you need, it figures out the right document, fills it in as
              you go, and you can download it as a PDF or save it to revisit later.
            </p>
          </header>
          <DocumentCreator
            key={seed.key}
            initialDocumentType={seed.documentType}
            initialFields={seed.fields}
          />
        </div>
        {view === "history" ? (
          <DocumentsHistory onOpen={openDocument} onNew={newDocument} />
        ) : null}
      </main>
    </div>
  );
}
