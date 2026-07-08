import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import NDAForm from "@/components/NDAForm";
import { createDefaultFormData } from "@/lib/ndaDefaults";
import { NDAFormData } from "@/lib/types";

function ControlledNDAForm({ onChange }: { onChange: (data: NDAFormData) => void }) {
  const [data, setData] = useState(createDefaultFormData);
  return (
    <NDAForm
      data={data}
      onChange={(next) => {
        setData(next);
        onChange(next);
      }}
    />
  );
}

describe("NDAForm", () => {
  it("renders fields for both parties and the deal terms", () => {
    render(<NDAForm data={createDefaultFormData()} onChange={() => {}} />);

    expect(screen.getByText("Party A")).toBeInTheDocument();
    expect(screen.getByText("Party B")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Company Name")).toHaveLength(2);
    expect(screen.getByLabelText("Purpose")).toBeInTheDocument();
    expect(screen.getByLabelText("Effective Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Governing Law")).toBeInTheDocument();
    expect(screen.getByLabelText("Jurisdiction")).toBeInTheDocument();
  });

  it("calls onChange with the updated party A company name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledNDAForm onChange={onChange} />);

    const [companyNameA] = screen.getAllByLabelText("Company Name");
    await user.type(companyNameA, "Acme");

    expect(onChange).toHaveBeenCalled();
    const lastCallData = onChange.mock.calls.at(-1)![0];
    expect(lastCallData.partyA.companyName).toBe("Acme");
  });

  it("disables the MNDA term duration input when 'until terminated' is selected", async () => {
    const user = userEvent.setup();
    let data = createDefaultFormData();
    const { rerender } = render(
      <NDAForm data={data} onChange={(next) => (data = next)} />
    );

    await user.click(
      screen.getByRole("radio", {
        name: /continues until terminated/i,
      })
    );
    rerender(<NDAForm data={data} onChange={() => {}} />);

    expect(screen.getByLabelText("MNDA term duration")).toBeDisabled();
  });
});
