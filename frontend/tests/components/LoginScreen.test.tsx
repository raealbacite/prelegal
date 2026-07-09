import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LoginScreen from "@/components/LoginScreen";

describe("LoginScreen", () => {
  it("calls onContinue when the form is submitted, without requiring input", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<LoginScreen onContinue={onContinue} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("calls onContinue after filling in name and email", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<LoginScreen onContinue={onContinue} />);

    await user.type(screen.getByLabelText(/name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
