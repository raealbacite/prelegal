import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NdaCreator from "@/components/NdaCreator";

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getAllByLabelText("Company Name")[0], "Acme Corp");
  await user.type(screen.getAllByLabelText("Company Name")[1], "Globex Inc");
  fireEvent.change(screen.getByLabelText("Effective Date"), {
    target: { value: "2026-07-08" },
  });
  await user.type(screen.getByLabelText("Governing Law"), "Delaware");
  await user.type(screen.getByLabelText("Jurisdiction"), "courts located in New Castle, DE");
}

const toBlob = vi.fn(async () => new Blob(["fake-pdf"], { type: "application/pdf" }));

vi.mock(import("@react-pdf/renderer"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, pdf: () => ({ toBlob }) };
});

describe("NdaCreator", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    toBlob.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the download button disabled until required fields are filled", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    const downloadButton = screen.getByRole("button", { name: /download pdf/i });
    expect(downloadButton).toBeDisabled();

    await fillRequiredFields(user);

    expect(downloadButton).toBeEnabled();
  });

  it("generates and downloads a PDF when clicked", async () => {
    const user = userEvent.setup();
    render(<NdaCreator />);

    await fillRequiredFields(user);

    const downloadButton = screen.getByRole("button", { name: /download pdf/i });
    await user.click(downloadButton);

    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
