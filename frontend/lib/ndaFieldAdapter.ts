import { createDefaultFormData } from "./ndaDefaults";
import {
  ConfidentialityTermType,
  FieldsBag,
  MndaTermType,
  NDAFormData,
  PartyInfo,
} from "./types";

const MNDA_TERM_TYPES: MndaTermType[] = ["duration", "untilTerminated"];
const CONFIDENTIALITY_TERM_TYPES: ConfidentialityTermType[] = ["duration", "perpetual"];

/**
 * Map the generic field bag onto the structured NDAFormData the bespoke NDA
 * renderer expects. The Mutual NDA's fields use the same flattened keys the
 * assistant is told to emit (e.g. "partyA.companyName", "mndaTermType"), so this
 * is a deterministic copy — no free-text parsing or guessing. Anything the bag
 * doesn't set keeps its sensible default from createDefaultFormData().
 */
export function adaptFieldsToNdaFormData(fields: FieldsBag): NDAFormData {
  const data = createDefaultFormData();

  const applyParty = (party: PartyInfo, prefix: string) => {
    for (const key of ["companyName", "printName", "title", "noticeAddress"] as (keyof PartyInfo)[]) {
      const value = fields[`${prefix}.${key}`];
      if (typeof value === "string" && value.trim()) party[key] = value;
    }
  };
  applyParty(data.partyA, "partyA");
  applyParty(data.partyB, "partyB");

  for (const key of ["purpose", "effectiveDate", "governingLaw", "jurisdiction", "modifications"] as const) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) data[key] = value;
  }

  if (MNDA_TERM_TYPES.includes(fields.mndaTermType as MndaTermType)) {
    data.mndaTermType = fields.mndaTermType as MndaTermType;
  }
  if (fields.mndaTermDuration?.trim()) data.mndaTermDuration = fields.mndaTermDuration;

  if (CONFIDENTIALITY_TERM_TYPES.includes(fields.confidentialityTermType as ConfidentialityTermType)) {
    data.confidentialityTermType = fields.confidentialityTermType as ConfidentialityTermType;
  }
  if (fields.confidentialityTermDuration?.trim()) {
    data.confidentialityTermDuration = fields.confidentialityTermDuration;
  }

  return data;
}
