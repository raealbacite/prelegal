"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import NDAForm from "./NDAForm";
import NDAPreview from "./NDAPreview";
import NdaPdfDocument from "./NdaPdfDocument";
import { createDefaultFormData, isFormComplete } from "@/lib/ndaDefaults";

export default function NdaCreator() {
  const [data, setData] = useState(() => createDefaultFormData());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const complete = isFormComplete(data);

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError(false);
    try {
      const blob = await pdf(<NdaPdfDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mutual-nda.pdf";
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
        <NDAForm data={data} onChange={setData} />
      </div>
      <div className="flex flex-col gap-4">
        <NDAPreview data={data} />
        <button
          type="button"
          onClick={handleDownload}
          disabled={!complete || isDownloading}
          className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isDownloading ? "Preparing PDF..." : "Download PDF"}
        </button>
        {!complete ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Fill in both parties&apos; company names, the purpose, effective date, governing law,
            and jurisdiction to enable download.
          </p>
        ) : null}
        {downloadError ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            Something went wrong generating the PDF. Please try again.
          </p>
        ) : null}
      </div>
    </div>
  );
}
