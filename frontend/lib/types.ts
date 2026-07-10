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

/** A supported document's metadata + raw template, from GET /api/templates/{filename}. */
export interface DocumentTemplate {
  filename: string;
  name: string;
  description: string;
  variables: TemplateVariable[];
  markdown: string;
}

/** An authenticated user, from the auth endpoints. */
export interface User {
  id: number;
  email: string;
}

/** A saved document as it appears in the history list (no field values). */
export interface DocumentSummary {
  id: number;
  title: string;
  documentType: string;
  createdAt: string;
  updatedAt: string;
}

/** A saved document with its collected field values, for re-opening in the creator. */
export interface DocumentDetail extends DocumentSummary {
  fields: FieldsBag;
}
