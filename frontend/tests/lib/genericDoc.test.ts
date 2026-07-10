import { describe, expect, it } from "vitest";
import {
  fillTemplate,
  isDocComplete,
  missingFieldNames,
  normalizeLabel,
  pdfFileName,
} from "@/lib/genericDoc";
import { TemplateVariable } from "@/lib/types";

const VARS: TemplateVariable[] = [
  { name: "Customer" },
  { name: "Provider" },
  { name: "Subscription Period" },
];

const MARKDOWN = `# Cloud Service Agreement

1. <span class="header_2" id="1">Service</span>
    1. During the <span class="orderform_link">Subscription Period</span>, <span class="coverpage_link">Customer</span> may use the service from <span class="coverpage_link">Provider’s</span> platform. Renews for more <span class="orderform_link">Subscription Periods</span>.

2. <span class="header_2" id="2">Payment</span>
    1. <span class="coverpage_link">Customer</span> pays <span class="coverpage_link">Provider</span>.`;

describe("normalizeLabel", () => {
  it("strips markup and possessives", () => {
    expect(normalizeLabel("**Provider’s**")).toBe("Provider");
    expect(normalizeLabel('"Customer"')).toBe("Customer");
  });
});

describe("fillTemplate", () => {
  it("substitutes filled values and bracketed placeholders, split into sections", () => {
    const sections = fillTemplate(MARKDOWN, VARS, { Customer: "Acme", Provider: "Globex" });

    expect(sections.map((s) => s.heading)).toEqual(["Service", "Payment"]);
    expect(sections[0].body).toContain("Acme");
    expect(sections[0].body).toContain("Globex"); // possessive "Provider’s" resolved
    // Unfilled field renders as a placeholder.
    expect(sections[0].body).toContain("[Subscription Period]");
    // Plural span collapses to the singular field name, not a separate placeholder.
    expect(sections[0].body).not.toContain("[Subscription Periods]");
    // The markdown H1 title is dropped (the doc name is rendered separately).
    expect(sections[0].heading).not.toContain("#");
  });

  it("leaves no leftover span tags in the output", () => {
    const sections = fillTemplate(MARKDOWN, VARS, {});
    for (const s of sections) {
      expect(s.body).not.toContain("<span");
      expect(s.body).not.toContain("</span>");
    }
  });
});

describe("completeness helpers", () => {
  it("reports missing fields and completeness", () => {
    expect(missingFieldNames(VARS, { Customer: "Acme" })).toEqual([
      "Provider",
      "Subscription Period",
    ]);
    expect(isDocComplete(VARS, { Customer: "Acme" })).toBe(false);
    expect(
      isDocComplete(VARS, { Customer: "Acme", Provider: "G", "Subscription Period": "1 year" }),
    ).toBe(true);
  });
});

describe("pdfFileName", () => {
  it("turns a template filename into a pdf name", () => {
    expect(pdfFileName("csa.md")).toBe("csa.pdf");
  });
});
