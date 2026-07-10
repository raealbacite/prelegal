export interface PartyInfo {
  companyName: string;
  printName: string;
  title: string;
  noticeAddress: string;
}

export type MndaTermType = "duration" | "untilTerminated";
export type ConfidentialityTermType = "duration" | "perpetual";

export interface NDAFormData {
  partyA: PartyInfo;
  partyB: PartyInfo;
  purpose: string;
  effectiveDate: string;
  mndaTermType: MndaTermType;
  mndaTermDuration: string;
  confidentialityTermType: ConfidentialityTermType;
  confidentialityTermDuration: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
}

/** A flat, document-agnostic bag of collected field values, keyed by field name. */
export type FieldsBag = Record<string, string>;

export interface TemplateVariable {
  name: string;
  description?: string | null;
}

/** A supported document's metadata + raw template, from GET /api/documents/{filename}. */
export interface DocumentTemplate {
  filename: string;
  name: string;
  description: string;
  variables: TemplateVariable[];
  markdown: string;
}
