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
