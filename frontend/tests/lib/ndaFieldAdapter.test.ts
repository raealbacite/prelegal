import { describe, expect, it } from "vitest";
import { adaptFieldsToNdaFormData } from "@/lib/ndaFieldAdapter";

describe("adaptFieldsToNdaFormData", () => {
  it("maps dotted party keys and scalar fields deterministically", () => {
    const data = adaptFieldsToNdaFormData({
      "partyA.companyName": "Acme Corp",
      "partyB.companyName": "Globex Inc",
      "partyA.printName": "Jane Doe",
      purpose: "Evaluating a partnership",
      governingLaw: "Delaware",
    });

    expect(data.partyA.companyName).toBe("Acme Corp");
    expect(data.partyA.printName).toBe("Jane Doe");
    expect(data.partyB.companyName).toBe("Globex Inc");
    expect(data.purpose).toBe("Evaluating a partnership");
    expect(data.governingLaw).toBe("Delaware");
  });

  it("applies valid term-type enums and durations", () => {
    const data = adaptFieldsToNdaFormData({
      mndaTermType: "untilTerminated",
      confidentialityTermType: "perpetual",
      mndaTermDuration: "2 year(s)",
    });
    expect(data.mndaTermType).toBe("untilTerminated");
    expect(data.confidentialityTermType).toBe("perpetual");
    expect(data.mndaTermDuration).toBe("2 year(s)");
  });

  it("keeps defaults for unset or invalid values", () => {
    const data = adaptFieldsToNdaFormData({ mndaTermType: "nonsense" });
    // Falls back to the default rather than accepting a bad enum value.
    expect(data.mndaTermType).toBe("duration");
    expect(data.partyA.companyName).toBe("");
    expect(data.purpose).toBeTruthy(); // default purpose preserved
  });
});
