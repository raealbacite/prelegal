import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("shows the login screen first, then the Document Creator after continuing", async () => {
    const user = userEvent.setup();
    render(<Home />);

    expect(screen.getByRole("heading", { name: /welcome to prelegal/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /legal document creator/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("heading", { name: /legal document creator/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /welcome to prelegal/i }),
    ).not.toBeInTheDocument();
  });
});
