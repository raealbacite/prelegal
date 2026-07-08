import { describe, expect, it } from "vitest";
import { createDefaultFormData, isFormComplete } from "@/lib/ndaDefaults";
import { NDAFormData } from "@/lib/types";

describe("createDefaultFormData", () => {
  it("starts with empty parties and no effective date", () => {
    const data = createDefaultFormData();
    expect(data.partyA.companyName).toBe("");
    expect(data.partyB.companyName).toBe("");
    expect(data.effectiveDate).toBe("");
  });

  it("returns a fresh object on each call", () => {
    const a = createDefaultFormData();
    const b = createDefaultFormData();
    a.partyA.companyName = "Acme";
    expect(b.partyA.companyName).toBe("");
  });
});

describe("isFormComplete", () => {
  function completeData() {
    const data = createDefaultFormData();
    data.partyA.companyName = "Acme Corp";
    data.partyB.companyName = "Globex Inc";
    data.effectiveDate = "2026-07-08";
    data.governingLaw = "Delaware";
    data.jurisdiction = "courts located in New Castle, DE";
    return data;
  }

  it("is true when all required fields are filled", () => {
    expect(isFormComplete(completeData())).toBe(true);
  });

  const blankers: [string, (data: NDAFormData) => void][] = [
    ["partyA.companyName", (data) => (data.partyA.companyName = "")],
    ["partyB.companyName", (data) => (data.partyB.companyName = "")],
    ["purpose", (data) => (data.purpose = "")],
    ["effectiveDate", (data) => (data.effectiveDate = "")],
    ["governingLaw", (data) => (data.governingLaw = "")],
    ["jurisdiction", (data) => (data.jurisdiction = "")],
  ];

  it.each(blankers)("is false when %s is blank", (_path, blank) => {
    const data = completeData();
    blank(data);
    expect(isFormComplete(data)).toBe(false);
  });

  it("treats whitespace-only values as blank", () => {
    const data = completeData();
    data.governingLaw = "   ";
    expect(isFormComplete(data)).toBe(false);
  });

  it("is false when the MNDA term is set to a duration but the duration is blank", () => {
    const data = completeData();
    data.mndaTermType = "duration";
    data.mndaTermDuration = "";
    expect(isFormComplete(data)).toBe(false);
  });

  it("is true when the MNDA term duration is blank but 'until terminated' is selected", () => {
    const data = completeData();
    data.mndaTermType = "untilTerminated";
    data.mndaTermDuration = "";
    expect(isFormComplete(data)).toBe(true);
  });

  it("is false when the confidentiality term is set to a duration but the duration is blank", () => {
    const data = completeData();
    data.confidentialityTermType = "duration";
    data.confidentialityTermDuration = "   ";
    expect(isFormComplete(data)).toBe(false);
  });

  it("is true when the confidentiality term duration is blank but 'perpetual' is selected", () => {
    const data = completeData();
    data.confidentialityTermType = "perpetual";
    data.confidentialityTermDuration = "";
    expect(isFormComplete(data)).toBe(true);
  });
});
