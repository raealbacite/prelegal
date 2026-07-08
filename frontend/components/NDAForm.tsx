"use client";

import { NDAFormData, PartyInfo } from "@/lib/types";

interface NDAFormProps {
  data: NDAFormData;
  onChange: (data: NDAFormData) => void;
}

const fieldClasses =
  "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-800";
const labelClasses = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const durationInputClasses =
  "w-28 rounded-md border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-800";

export default function NDAForm({ data, onChange }: NDAFormProps) {
  function set<K extends keyof NDAFormData>(key: K, value: NDAFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  function setParty(which: "partyA" | "partyB", patch: Partial<PartyInfo>) {
    onChange({ ...data, [which]: { ...data[which], ...patch } });
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
      <PartyFieldset
        label="Party A"
        party={data.partyA}
        onChange={(patch) => setParty("partyA", patch)}
      />
      <PartyFieldset
        label="Party B"
        party={data.partyB}
        onChange={(patch) => setParty("partyB", patch)}
      />

      <label className={labelClasses}>
        Purpose
        <textarea
          className={fieldClasses}
          rows={2}
          value={data.purpose}
          onChange={(e) => set("purpose", e.target.value)}
          required
        />
      </label>

      <label className={labelClasses}>
        Effective Date
        <input
          type="date"
          className={fieldClasses}
          value={data.effectiveDate}
          onChange={(e) => set("effectiveDate", e.target.value)}
          required
        />
      </label>

      <fieldset className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <legend className="px-1 text-sm font-semibold">MNDA Term</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mndaTermType"
              checked={data.mndaTermType === "duration"}
              onChange={() => set("mndaTermType", "duration")}
            />
            Expires
            <input
              type="text"
              aria-label="MNDA term duration"
              className={durationInputClasses}
              value={data.mndaTermDuration}
              onChange={(e) => set("mndaTermDuration", e.target.value)}
              disabled={data.mndaTermType !== "duration"}
              required={data.mndaTermType === "duration"}
            />
            from Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mndaTermType"
              checked={data.mndaTermType === "untilTerminated"}
              onChange={() => set("mndaTermType", "untilTerminated")}
            />
            Continues until terminated in accordance with the terms of the MNDA
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <legend className="px-1 text-sm font-semibold">Term of Confidentiality</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="confidentialityTermType"
              checked={data.confidentialityTermType === "duration"}
              onChange={() => set("confidentialityTermType", "duration")}
            />
            <input
              type="text"
              aria-label="Term of confidentiality duration"
              className={durationInputClasses}
              value={data.confidentialityTermDuration}
              onChange={(e) => set("confidentialityTermDuration", e.target.value)}
              disabled={data.confidentialityTermType !== "duration"}
              required={data.confidentialityTermType === "duration"}
            />
            from Effective Date (trade secrets excepted)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="confidentialityTermType"
              checked={data.confidentialityTermType === "perpetual"}
              onChange={() => set("confidentialityTermType", "perpetual")}
            />
            In perpetuity
          </label>
        </div>
      </fieldset>

      <label className={labelClasses}>
        Governing Law
        <input
          type="text"
          className={fieldClasses}
          placeholder="e.g. Delaware"
          value={data.governingLaw}
          onChange={(e) => set("governingLaw", e.target.value)}
          required
        />
      </label>

      <label className={labelClasses}>
        Jurisdiction
        <input
          type="text"
          className={fieldClasses}
          placeholder="e.g. courts located in New Castle, DE"
          value={data.jurisdiction}
          onChange={(e) => set("jurisdiction", e.target.value)}
          required
        />
      </label>

      <label className={labelClasses}>
        MNDA Modifications (optional)
        <textarea
          className={fieldClasses}
          rows={2}
          value={data.modifications}
          onChange={(e) => set("modifications", e.target.value)}
        />
      </label>
    </form>
  );
}

function PartyFieldset({
  label,
  party,
  onChange,
}: {
  label: string;
  party: PartyInfo;
  onChange: (patch: Partial<PartyInfo>) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <label className={labelClasses}>
        Company Name
        <input
          type="text"
          className={fieldClasses}
          value={party.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          required
        />
      </label>
      <label className={labelClasses}>
        Print Name
        <input
          type="text"
          className={fieldClasses}
          value={party.printName}
          onChange={(e) => onChange({ printName: e.target.value })}
        />
      </label>
      <label className={labelClasses}>
        Title
        <input
          type="text"
          className={fieldClasses}
          value={party.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
      <label className={labelClasses}>
        Notice Address
        <input
          type="text"
          className={fieldClasses}
          value={party.noticeAddress}
          onChange={(e) => onChange({ noticeAddress: e.target.value })}
        />
      </label>
    </fieldset>
  );
}
