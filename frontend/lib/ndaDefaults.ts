import { NDAFormData, PartyInfo } from "./types";

function emptyParty(): PartyInfo {
  return { companyName: "", printName: "", title: "", noticeAddress: "" };
}

export function createDefaultFormData(): NDAFormData {
  return {
    partyA: emptyParty(),
    partyB: emptyParty(),
    purpose:
      "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate: "",
    mndaTermType: "duration",
    mndaTermDuration: "1 year(s)",
    confidentialityTermType: "duration",
    confidentialityTermDuration: "1 year(s)",
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
  };
}

export function isFormComplete(data: NDAFormData): boolean {
  const mndaTermFilled = data.mndaTermType !== "duration" || Boolean(data.mndaTermDuration.trim());
  const confidentialityTermFilled =
    data.confidentialityTermType !== "duration" || Boolean(data.confidentialityTermDuration.trim());

  return Boolean(
    data.partyA.companyName.trim() &&
      data.partyB.companyName.trim() &&
      data.purpose.trim() &&
      data.effectiveDate.trim() &&
      data.governingLaw.trim() &&
      data.jurisdiction.trim() &&
      mndaTermFilled &&
      confidentialityTermFilled
  );
}
