import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App routing", () => {
  it("shows a not-found page for unknown URLs", () => {
    window.history.pushState({}, "", "/this/does/not/exist");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Page Not Found" }),
    ).toBeTruthy();
    expect(screen.getByText("Go To Player Search")).toBeTruthy();
  });
});
