import { DocumentTemplate, FieldsBag } from "@/lib/types";
import { ATTRIBUTION, fillTemplate } from "@/lib/genericDoc";

export default function GenericPreview({
  doc,
  fields,
}: {
  doc: DocumentTemplate;
  fields: FieldsBag;
}) {
  const sections = fillTemplate(doc.markdown, doc.variables, fields);

  return (
    <article className="flex flex-col gap-6 rounded-lg border border-zinc-300 bg-white p-6 text-sm leading-relaxed text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
      <h2 className="text-center text-xl font-semibold">{doc.name}</h2>

      <section className="flex flex-col gap-4">
        {sections.map((s) => (
          <div key={s.number}>
            <h3 className="font-semibold">
              {s.number}. {s.heading}
            </h3>
            {s.body ? <p className="whitespace-pre-wrap">{s.body}</p> : null}
          </div>
        ))}
      </section>

      <footer className="text-xs text-zinc-500 dark:text-zinc-400">{ATTRIBUTION}</footer>
    </article>
  );
}
