// @vitest-environment node
import { pdf } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import NdaPdfDocument from "@/components/NdaPdfDocument";
import { createDefaultFormData } from "@/lib/ndaDefaults";

describe("NdaPdfDocument", () => {
  it("renders a well-formed, non-empty PDF for a filled-in form", async () => {
    const data = createDefaultFormData();
    data.partyA.companyName = "Acme Corp";
    data.partyB.companyName = "Globex Inc";
    data.effectiveDate = "2026-07-08";
    data.governingLaw = "Delaware";
    data.jurisdiction = "courts located in New Castle, DE";

    const buffer = await pdf(<NdaPdfDocument data={data} />).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of buffer) {
      chunks.push(chunk as Buffer);
    }
    const output = Buffer.concat(chunks);

    expect(output.length).toBeGreaterThan(0);
    expect(output.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(output.subarray(-6).toString("latin1").trim()).toBe("%%EOF");
  });

  it("renders successfully even with an empty/default form", async () => {
    const buffer = await pdf(<NdaPdfDocument data={createDefaultFormData()} />).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of buffer) {
      chunks.push(chunk as Buffer);
    }
    expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
  });
});
