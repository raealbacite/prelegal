import { FieldsBag, TemplateVariable } from "./types";

export interface DocSection {
  number: string;
  heading: string;
  body: string;
}

export const ATTRIBUTION =
  "Based on a Common Paper standard agreement, free to use under CC BY 4.0 (creativecommons.org/licenses/by/4.0).";

const LINK_SPAN_RE = /<span class="[A-Za-z]+_link"[^>]*>([\s\S]*?)<\/span>/g;

/** Clean the inner text of a variable span into a field label. Mirrors the
 * backend `_normalize_label` so the same span resolves to the same field key. */
export function normalizeLabel(raw: string): string {
  let text = raw.replace(/\*\*/g, "").trim();
  text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  for (const suffix of ["’s", "'s", "’", "'"]) {
    if (text.endsWith(suffix)) {
      text = text.slice(0, -suffix.length);
      break;
    }
  }
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Resolve a span's label to a canonical field name from the known variable set,
 * collapsing a trailing plural to its singular when the singular is the known
 * field (e.g. "Subscription Periods" -> "Subscription Period"). Mirrors the
 * backend so preview substitution agrees with field extraction.
 */
function resolveFieldName(label: string, knownLower: Set<string>): string {
  if (knownLower.has(label.toLowerCase())) return label;
  const singular = label.slice(0, -1);
  if (label.endsWith("s") && knownLower.has(singular.toLowerCase())) return singular;
  return label;
}

function stripMarkup(text: string): string {
  return text
    .replace(/<\/?span[^>]*>/g, "") // drop remaining structural span tags, keep text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // markdown links -> link text
    .replace(/\*\*/g, ""); // bold markers
}

/**
 * Fill a raw template's variable spans with collected values (unfilled ones
 * become bracketed placeholders), strip the markup, and split into numbered
 * sections for the preview and PDF. This is a generic, best-effort renderer
 * shared by GenericPreview and GenericPdfDocument.
 */
export function fillTemplate(
  markdown: string,
  variables: TemplateVariable[],
  fields: FieldsBag,
): DocSection[] {
  const knownLower = new Set(variables.map((v) => v.name.toLowerCase()));

  const filled = markdown.replace(LINK_SPAN_RE, (_match, inner: string) => {
    const name = resolveFieldName(normalizeLabel(inner), knownLower);
    const value = fields[name]?.trim();
    return value || `[${name}]`;
  });

  const sections: DocSection[] = [];
  let current: DocSection | null = null;
  for (const rawLine of stripMarkup(filled).split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (/^#/.test(line.trim())) continue; // skip the markdown H1 title

    const topLevel = line.match(/^(\d+)\.\s+(.*)$/); // no leading indentation
    if (topLevel) {
      if (current) sections.push(current);
      current = { number: topLevel[1], heading: topLevel[2].trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  for (const section of sections) section.body = section.body.trim();
  return sections;
}

/** Field names still awaiting a value. */
export function missingFieldNames(variables: TemplateVariable[], fields: FieldsBag): string[] {
  return variables.filter((v) => !fields[v.name]?.trim()).map((v) => v.name);
}

/** A generic document is ready to download once every field has a value. */
export function isDocComplete(variables: TemplateVariable[], fields: FieldsBag): boolean {
  return variables.length > 0 && missingFieldNames(variables, fields).length === 0;
}

/** A filesystem-friendly download name derived from the document filename. */
export function pdfFileName(filename: string): string {
  return filename.replace(/\.md$/, "") + ".pdf";
}
