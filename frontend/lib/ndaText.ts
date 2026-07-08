import { NDAFormData, PartyInfo } from "./types";

export function formatDateLong(iso: string): string {
  if (!iso) return "[Effective Date]";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function mndaTermText(data: NDAFormData): string {
  return data.mndaTermType === "duration"
    ? `${data.mndaTermDuration.trim() || "[term]"} from the Effective Date`
    : "the date this MNDA is terminated in accordance with its terms";
}

export function confidentialityTermText(data: NDAFormData): string {
  return data.confidentialityTermType === "duration"
    ? `${
        data.confidentialityTermDuration.trim() || "[term]"
      } from the Effective Date (or, in the case of trade secrets, until no longer considered a trade secret under applicable law)`
    : "an indefinite period, in perpetuity";
}

export interface TermOptionLine {
  selected: boolean;
  text: string;
}

/** Cover Page checkbox-style display for the MNDA Term choice, shared by the HTML preview and the PDF. */
export function mndaTermOptionLines(data: NDAFormData): TermOptionLine[] {
  return [
    {
      selected: data.mndaTermType === "duration",
      text: `Expires ${data.mndaTermDuration.trim() || "[term]"} from Effective Date.`,
    },
    {
      selected: data.mndaTermType === "untilTerminated",
      text: "Continues until terminated in accordance with the terms of the MNDA.",
    },
  ];
}

/** Cover Page checkbox-style display for the Term of Confidentiality choice, shared by the HTML preview and the PDF. */
export function confidentialityTermOptionLines(data: NDAFormData): TermOptionLine[] {
  return [
    {
      selected: data.confidentialityTermType === "duration",
      text: `${
        data.confidentialityTermDuration.trim() || "[term]"
      } from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
    },
    {
      selected: data.confidentialityTermType === "perpetual",
      text: "In perpetuity.",
    },
  ];
}

export interface SignatureField {
  label: string;
  field: keyof PartyInfo | null;
}

/** Rows of the Cover Page signature table, shared by the HTML preview and the PDF. */
export const SIGNATURE_FIELDS: SignatureField[] = [
  { label: "Signature", field: null },
  { label: "Print Name", field: "printName" },
  { label: "Title", field: "title" },
  { label: "Company", field: "companyName" },
  { label: "Notice Address", field: "noticeAddress" },
  { label: "Date", field: null },
];

export function signatureFieldValue(row: SignatureField, party: PartyInfo): string {
  return row.field ? party[row.field] : "";
}

export interface DocSection {
  number: number;
  heading: string;
  body: string;
}

/**
 * Adapted from templates/mutual-nda.md, with Cover Page cross-references
 * inlined into the prose since this app merges the Cover Page and Standard
 * Terms into one filled-in document.
 */
export function buildStandardTermsSections(data: NDAFormData): DocSection[] {
  const purpose = data.purpose.trim() || "[Purpose]";
  const governingLaw = data.governingLaw.trim() || "[Governing Law]";
  const jurisdiction = data.jurisdiction.trim() || "[Jurisdiction]";
  const effectiveDate = formatDateLong(data.effectiveDate);
  const mndaTerm = mndaTermText(data);
  const confidentialityTerm = confidentialityTermText(data);

  return [
    {
      number: 1,
      heading: "Introduction",
      body: `This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page above) ("MNDA") allows each party ("Disclosing Party") to disclose or make available information in connection with ${purpose} which (1) the Disclosing Party identifies to the receiving party ("Receiving Party") as "confidential", "proprietary", or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure ("Confidential Information"). Each party's Confidential Information also includes the existence and status of the parties' discussions and the information above. Confidential Information includes technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions and know-how. Each party is identified above and capitalized terms have the meanings given herein or above.`,
    },
    {
      number: 2,
      heading: "Use and Protection of Confidential Information",
      body: `The Receiving Party shall: (a) use Confidential Information solely for ${purpose}; (b) not disclose Confidential Information to third parties without the Disclosing Party's prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors and other representatives having a reasonable need to know for ${purpose}, provided these representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.`,
    },
    {
      number: 3,
      heading: "Exceptions",
      body: `The Receiving Party's obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.`,
    },
    {
      number: 4,
      heading: "Disclosures Required by Law",
      body: `The Receiving Party may disclose Confidential Information to the extent required by law, regulation or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party's expense, with the Disclosing Party's efforts to obtain confidential treatment for the Confidential Information.`,
    },
    {
      number: 5,
      heading: "Term and Termination",
      body: `This MNDA commences on ${effectiveDate} and expires at the end of ${mndaTerm}. Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party's obligations relating to Confidential Information will survive for ${confidentialityTerm}, despite any expiration or termination of this MNDA.`,
    },
    {
      number: 6,
      heading: "Return or Destruction of Confidential Information",
      body: `Upon expiration or termination of this MNDA or upon the Disclosing Party's earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party's written request, destroy all Confidential Information in the Receiving Party's possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.`,
    },
    {
      number: 7,
      heading: "Proprietary Rights",
      body: `The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information and its disclosure to the Receiving Party grants no license under such rights.`,
    },
    {
      number: 8,
      heading: "Disclaimer",
      body: `ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.`,
    },
    {
      number: 9,
      heading: "Governing Law and Jurisdiction",
      body: `This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of ${governingLaw}, without regard to the conflict of laws provisions of such state. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in ${jurisdiction}. Each party irrevocably submits to the exclusive jurisdiction of such courts in any such suit, action, or proceeding.`,
    },
    {
      number: 10,
      heading: "Equitable Relief",
      body: `A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.`,
    },
    {
      number: 11,
      heading: "General",
      body: `Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party's permitted successors and assigns. Waivers must be signed by the waiving party's authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page above) constitutes the entire agreement of the parties with respect to its subject matter, and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests and approvals under this MNDA must be sent in writing to the email or postal addresses above and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.`,
    },
  ];
}

export const ATTRIBUTION =
  "Based on the Common Paper Mutual Non-Disclosure Agreement (Version 1.0), free to use under CC BY 4.0 (creativecommons.org/licenses/by/4.0).";
