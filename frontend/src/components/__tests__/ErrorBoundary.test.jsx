import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

function Page({ crash }) {
  if (crash) throw new Error("boom");
  return <p>Page content</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs caught render errors; keep the test output readable
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the fallback when a child throws", () => {
    render(
      <ErrorBoundary resetKey="/stats">
        <Page crash />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("recovers when the reset key changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/stats">
        <Page crash />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary resetKey="/leaderboard">
        <Page crash={false} />
      </ErrorBoundary>,
    );

    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.getByText("Page content")).toBeTruthy();
  });

  it("stays on the fallback while the reset key is unchanged", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/stats">
        <Page crash />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary resetKey="/stats">
        <Page crash={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });
});
