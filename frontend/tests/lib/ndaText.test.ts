import { describe, expect, it } from "vitest";
import { createDefaultFormData } from "@/lib/ndaDefaults";
import {
  buildStandardTermsSections,
  confidentialityTermOptionLines,
  confidentialityTermText,
  formatDateLong,
  mndaTermOptionLines,
  mndaTermText,
} from "@/lib/ndaText";

describe("formatDateLong", () => {
  it("formats an ISO date as a long-form US date", () => {
    expect(formatDateLong("2026-07-08")).toBe("July 8, 2026");
  });

  it("returns a placeholder when no date is given", () => {
    expect(formatDateLong("")).toBe("[Effective Date]");
  });
});

describe("mndaTermText", () => {
  it("describes a fixed duration term", () => {
    const data = createDefaultFormData();
    data.mndaTermType = "duration";
    data.mndaTermDuration = "2 year(s)";
    expect(mndaTermText(data)).toBe("2 year(s) from the Effective Date");
  });

  it("describes an until-terminated term", () => {
    const data = createDefaultFormData();
    data.mndaTermType = "untilTerminated";
    expect(mndaTermText(data)).toBe(
      "the date this MNDA is terminated in accordance with its terms"
    );
  });
});

describe("confidentialityTermText", () => {
  it("describes a fixed duration term with the trade secret carve-out", () => {
    const data = createDefaultFormData();
    data.confidentialityTermType = "duration";
    data.confidentialityTermDuration = "3 year(s)";
    expect(confidentialityTermText(data)).toContain("3 year(s) from the Effective Date");
    expect(confidentialityTermText(data)).toContain("trade secret");
  });

  it("describes a perpetual term", () => {
    const data = createDefaultFormData();
    data.confidentialityTermType = "perpetual";
    expect(confidentialityTermText(data)).toBe("an indefinite period, in perpetuity");
  });
});

describe("buildStandardTermsSections", () => {
  it("produces all 11 numbered sections in order", () => {
    const data = createDefaultFormData();
    const sections = buildStandardTermsSections(data);
    expect(sections).toHaveLength(11);
    expect(sections.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(sections[0].heading).toBe("Introduction");
    expect(sections[10].heading).toBe("General");
  });

  it("substitutes the purpose into sections 1 and 2", () => {
    const data = createDefaultFormData();
    data.purpose = "Testing a prototype NDA generator";
    const sections = buildStandardTermsSections(data);
    expect(sections[0].body).toContain("Testing a prototype NDA generator");
    expect(sections[1].body).toContain("Testing a prototype NDA generator");
  });

  it("substitutes governing law and jurisdiction into section 9", () => {
    const data = createDefaultFormData();
    data.governingLaw = "Delaware";
    data.jurisdiction = "courts located in New Castle, DE";
    const section9 = buildStandardTermsSections(data)[8];
    expect(section9.body).toContain("the State of Delaware");
    expect(section9.body).toContain("courts located in New Castle, DE");
  });

  it("substitutes the effective date and term text into section 5", () => {
    const data = createDefaultFormData();
    data.effectiveDate = "2026-07-08";
    data.mndaTermType = "duration";
    data.mndaTermDuration = "1 year(s)";
    const section5 = buildStandardTermsSections(data)[4];
    expect(section5.body).toContain("commences on July 8, 2026");
    expect(section5.body).toContain("1 year(s) from the Effective Date");
  });

  it("falls back to bracket placeholders instead of rendering whitespace-only input", () => {
    const data = createDefaultFormData();
    data.purpose = "   ";
    data.governingLaw = "  ";
    data.jurisdiction = "\t";
    const sections = buildStandardTermsSections(data);
    expect(sections[0].body).toContain("[Purpose]");
    expect(sections[8].body).toContain("the State of [Governing Law]");
    expect(sections[8].body).toContain("courts located in [Jurisdiction]");
  });
});

describe("mndaTermOptionLines", () => {
  it("marks the duration option as selected and shows both options' text", () => {
    const data = createDefaultFormData();
    data.mndaTermType = "duration";
    data.mndaTermDuration = "2 year(s)";
    const [durationLine, untilTerminatedLine] = mndaTermOptionLines(data);
    expect(durationLine.selected).toBe(true);
    expect(durationLine.text).toBe("Expires 2 year(s) from Effective Date.");
    expect(untilTerminatedLine.selected).toBe(false);
  });

  it("marks the until-terminated option as selected", () => {
    const data = createDefaultFormData();
    data.mndaTermType = "untilTerminated";
    const [durationLine, untilTerminatedLine] = mndaTermOptionLines(data);
    expect(durationLine.selected).toBe(false);
    expect(untilTerminatedLine.selected).toBe(true);
  });

  it("falls back to a bracket placeholder when the duration is blank", () => {
    const data = createDefaultFormData();
    data.mndaTermDuration = "   ";
    expect(mndaTermOptionLines(data)[0].text).toBe("Expires [term] from Effective Date.");
  });
});

describe("confidentialityTermOptionLines", () => {
  it("marks the selected option and includes the trade secret carve-out", () => {
    const data = createDefaultFormData();
    data.confidentialityTermType = "duration";
    data.confidentialityTermDuration = "3 year(s)";
    const [durationLine, perpetualLine] = confidentialityTermOptionLines(data);
    expect(durationLine.selected).toBe(true);
    expect(durationLine.text).toContain("3 year(s) from Effective Date");
    expect(durationLine.text).toContain("trade secret");
    expect(perpetualLine.selected).toBe(false);
  });

  it("marks the perpetual option as selected", () => {
    const data = createDefaultFormData();
    data.confidentialityTermType = "perpetual";
    const [, perpetualLine] = confidentialityTermOptionLines(data);
    expect(perpetualLine.selected).toBe(true);
    expect(perpetualLine.text).toBe("In perpetuity.");
  });
});
