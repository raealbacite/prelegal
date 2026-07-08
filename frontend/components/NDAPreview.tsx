import { NDAFormData } from "@/lib/types";
import {
  ATTRIBUTION,
  SIGNATURE_FIELDS,
  buildStandardTermsSections,
  confidentialityTermOptionLines,
  formatDateLong,
  mndaTermOptionLines,
  signatureFieldValue,
} from "@/lib/ndaText";

export default function NDAPreview({ data }: { data: NDAFormData }) {
  const sections = buildStandardTermsSections(data);

  return (
    <article className="flex flex-col gap-6 rounded-lg border border-zinc-300 bg-white p-6 text-sm leading-relaxed text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
      <h2 className="text-center text-xl font-semibold">Mutual Non-Disclosure Agreement</h2>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Cover Page</h3>

        <Field label="Party A" value={data.partyA.companyName.trim() || "[Party A Company]"} />
        <Field label="Party B" value={data.partyB.companyName.trim() || "[Party B Company]"} />
        <Field label="Purpose" value={data.purpose.trim() || "[Purpose]"} />
        <Field label="Effective Date" value={formatDateLong(data.effectiveDate)} />

        <TermOptions label="MNDA Term" lines={mndaTermOptionLines(data)} />
        <TermOptions label="Term of Confidentiality" lines={confidentialityTermOptionLines(data)} />

        <Field label="Governing Law" value={data.governingLaw.trim() || "[Governing Law]"} />
        <Field label="Jurisdiction" value={data.jurisdiction.trim() || "[Jurisdiction]"} />
        {data.modifications ? (
          <Field label="MNDA Modifications" value={data.modifications} />
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border border-zinc-300 p-2 dark:border-zinc-700" />
              <th className="border border-zinc-300 p-2 dark:border-zinc-700">Party A</th>
              <th className="border border-zinc-300 p-2 dark:border-zinc-700">Party B</th>
            </tr>
          </thead>
          <tbody>
            {SIGNATURE_FIELDS.map((row) => (
              <tr key={row.label}>
                <td className="border border-zinc-300 p-2 font-medium dark:border-zinc-700">
                  {row.label}
                </td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">
                  {signatureFieldValue(row, data.partyA)}
                </td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">
                  {signatureFieldValue(row, data.partyB)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Standard Terms</h3>
        {sections.map((s) => (
          <div key={s.number}>
            <h4 className="font-semibold">
              {s.number}. {s.heading}
            </h4>
            <p>{s.body}</p>
          </div>
        ))}
      </section>

      <footer className="text-xs text-zinc-500 dark:text-zinc-400">{ATTRIBUTION}</footer>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function TermOptions({ label, lines }: { label: string; lines: { selected: boolean; text: string }[] }) {
  return (
    <div>
      <div className="font-medium">{label}</div>
      {lines.map((line) => (
        <div key={line.text}>
          {line.selected ? "☒" : "☐"} {line.text}
        </div>
      ))}
    </div>
  );
}
