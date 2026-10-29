import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CountryFlag from "../CountryFlag";
import { getFlagUrl } from "../../utils/flagUrls";

describe("getFlagUrl", () => {
  it("resolves alpha-2 codes case-insensitively", () => {
    expect(getFlagUrl("US")).toMatch(/us.*\.svg/);
    expect(getFlagUrl("jp")).toMatch(/jp.*\.svg/);
  });

  it("resolves UK subdivision codes", () => {
    expect(getFlagUrl("GB-ENG")).toMatch(/gb-eng.*\.svg/);
  });

  it("returns null for unknown or missing codes", () => {
    expect(getFlagUrl("ZZ")).toBeNull();
    expect(getFlagUrl("")).toBeNull();
    expect(getFlagUrl(null)).toBeNull();
  });
});

describe("CountryFlag", () => {
  it("renders a lazily loaded image labelled by aria-label", () => {
    render(<CountryFlag code="FR" aria-label="Flag of FR" className="flag" />);

    const img = screen.getByRole("img", { name: "Flag of FR" });
    expect(img).toHaveProperty("alt", "Flag of FR");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.className).toBe("flag");
  });

  it("renders the fallback for unknown codes", () => {
    render(<CountryFlag code="ZZ" fallback={<span>—</span>} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
  });
});
