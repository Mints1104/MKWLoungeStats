import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

// The Stats page crashes on render, to exercise the page-level error boundary
vi.mock("../Stats", () => ({
  default: () => {
    throw new Error("Stats page crashed");
  },
}));

describe("App routing", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a not-found page for unknown URLs", () => {
    window.history.pushState({}, "", "/this/does/not/exist");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Page Not Found" }),
    ).toBeTruthy();
    expect(screen.getByText("Go To Player Search")).toBeTruthy();
  });

  it("keeps the navigation when a page crashes, and recovers on navigating away", async () => {
    window.history.pushState({}, "", "/stats");

    render(<App />);

    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Player Stats" }));
    });

    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Mario Kart World Lounge Stats" }),
    ).toBeTruthy();
  });
});
