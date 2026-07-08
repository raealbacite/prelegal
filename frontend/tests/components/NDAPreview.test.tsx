import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NDAPreview from "@/components/NDAPreview";
import { createDefaultFormData } from "@/lib/ndaDefaults";

describe("NDAPreview", () => {
  it("renders the filled-in party names, terms, and all standard sections", () => {
    const data = createDefaultFormData();
    data.partyA.companyName = "Acme Corp";
    data.partyB.companyName = "Globex Inc";
    data.effectiveDate = "2026-07-08";
    data.governingLaw = "Delaware";
    data.jurisdiction = "courts located in New Castle, DE";

    render(<NDAPreview data={data} />);

    expect(screen.getByText("Mutual Non-Disclosure Agreement")).toBeInTheDocument();
    // "Acme Corp" appears twice: once as the Party A summary field, once in the signature table.
    expect(screen.getAllByText("Acme Corp")).toHaveLength(2);
    expect(screen.getAllByText("Globex Inc")).toHaveLength(2);
    // "July 8, 2026" appears in the Cover Page summary and again in Section 5's prose.
    expect(screen.getAllByText(/July 8, 2026/).length).toBeGreaterThan(0);

    for (let n = 1; n <= 11; n++) {
      expect(screen.getByText(new RegExp(`^${n}\\. `))).toBeInTheDocument();
    }

    expect(screen.getByText(/CC BY 4.0/)).toBeInTheDocument();
  });

  it("shows placeholders for unfilled required fields", () => {
    render(<NDAPreview data={createDefaultFormData()} />);

    expect(screen.getByText("[Party A Company]")).toBeInTheDocument();
    expect(screen.getByText("[Party B Company]")).toBeInTheDocument();
    expect(screen.getByText("[Governing Law]")).toBeInTheDocument();
    expect(screen.getByText("[Jurisdiction]")).toBeInTheDocument();
  });

  it("marks the selected MNDA term option with a filled checkbox", () => {
    const data = createDefaultFormData();
    data.mndaTermType = "untilTerminated";
    render(<NDAPreview data={data} />);

    expect(
      screen.getByText(/☒ Continues until terminated/)
    ).toBeInTheDocument();
    expect(screen.getByText(/☐ Expires/)).toBeInTheDocument();
  });
});
