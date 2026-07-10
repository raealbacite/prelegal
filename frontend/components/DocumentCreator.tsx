"use client";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import ChatPanel from "./ChatPanel";
import NDAPreview from "./NDAPreview";
import NdaPdfDocument from "./NdaPdfDocument";
import GenericPreview from "./GenericPreview";
import GenericPdfDocument from "./GenericPdfDocument";
import { ChatTurnResult, mergeFields } from "@/lib/chat";
import { fetchDocumentTemplate } from "@/lib/documentClient";
import { isDocComplete, missingFieldNames, pdfFileName } from "@/lib/genericDoc";
import { adaptFieldsToNdaFormData } from "@/lib/ndaFieldAdapter";
import { isFormComplete } from "@/lib/ndaDefaults";
import { DocumentTemplate, FieldsBag } from "@/lib/types";

const MNDA_FILENAMES = ["mutual-nda.md", "mutual-nda-coverpage.md"];
const isMnda = (filename: string | null) => filename !== null && MNDA_FILENAMES.includes(filename);

export default function DocumentCreator() {
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldsBag>({});
  const [loadedDoc, setLoadedDoc] = useState<DocumentTemplate | null>(null);
  const [erroredFilename, setErroredFilename] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  // Load the template for a non-NDA document once it's chosen (the NDA uses its
  // own bespoke renderer and needs no fetch). State is only set from the async
  // callbacks; which template is "current" is derived below from documentType.
  useEffect(() => {
    if (!documentType || isMnda(documentType) || loadedDoc?.filename === documentType) return;
    let cancelled = false;
    fetchDocumentTemplate(documentType)
      .then((doc) => {
        if (!cancelled) {
          setErroredFilename((prev) => (prev === documentType ? null : prev));
          setLoadedDoc(doc);
        }
      })
      .catch(() => {
        if (!cancelled) setErroredFilename(documentType);
      });
    return () => {
      cancelled = true;
    };
  }, [documentType, loadedDoc]);

  const docTemplate =
    documentType && !isMnda(documentType) && loadedDoc?.filename === documentType
      ? loadedDoc
      : null;
  // Only surface an error while there is no usable template for the current doc.
  const docError = !isMnda(documentType) && erroredFilename === documentType && !docTemplate;

  function handleResult(result: ChatTurnResult) {
    setFields((prev) => mergeFields(prev, result.fields));
    if (result.documentType) setDocumentType(result.documentType);
  }

  const ndaData = useMemo(() => adaptFieldsToNdaFormData(fields), [fields]);

  const complete = isMnda(documentType)
    ? isFormComplete(ndaData)
    : docTemplate
      ? isDocComplete(docTemplate.variables, fields)
      : false;

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError(false);
    try {
      const element = isMnda(documentType) ? (
        <NdaPdfDocument data={ndaData} />
      ) : docTemplate ? (
        <GenericPdfDocument doc={docTemplate} fields={fields} />
      ) : null;
      if (!element) return;

      const filename = isMnda(documentType)
        ? "mutual-nda.pdf"
        : pdfFileName(docTemplate!.filename);
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <ChatPanel documentType={documentType} fields={fields} onResult={handleResult} />
      </div>
      <div className="flex flex-col gap-4">
        <DocumentPane
          documentType={documentType}
          fields={fields}
          docTemplate={docTemplate}
          docError={docError}
          ndaData={ndaData}
        />
        {documentType && (isMnda(documentType) || docTemplate) ? (
          <>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!complete || isDownloading}
              className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
            {!complete ? <IncompleteHint documentType={documentType} docTemplate={docTemplate} fields={fields} /> : null}
            {downloadError ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                Something went wrong generating the PDF. Please try again.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function DocumentPane({
  documentType,
  fields,
  docTemplate,
  docError,
  ndaData,
}: {
  documentType: string | null;
  fields: FieldsBag;
  docTemplate: DocumentTemplate | null;
  docError: boolean;
  ndaData: ReturnType<typeof adaptFieldsToNdaFormData>;
}) {
  if (!documentType) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Your document preview will appear here once we&apos;ve figured out which
        agreement you need.
      </div>
    );
  }
  if (isMnda(documentType)) return <NDAPreview data={ndaData} />;
  if (docError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Couldn&apos;t load that document template. Please try again.
      </p>
    );
  }
  if (!docTemplate) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading document…</p>;
  }
  return <GenericPreview doc={docTemplate} fields={fields} />;
}

function IncompleteHint({
  documentType,
  docTemplate,
  fields,
}: {
  documentType: string | null;
  docTemplate: DocumentTemplate | null;
  fields: FieldsBag;
}) {
  if (isMnda(documentType)) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Fill in both parties&apos; company names, the purpose, effective date, governing law, and
        jurisdiction to enable download.
      </p>
    );
  }
  if (!docTemplate) return null;
  const remaining = missingFieldNames(docTemplate.variables, fields).length;
  return (
    <p className="text-xs text-zinc-500 dark:text-zinc-400">
      {remaining} field{remaining === 1 ? "" : "s"} still needed to enable download.
    </p>
  );
}
