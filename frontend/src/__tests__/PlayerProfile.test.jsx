import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PlayerProfile from "../PlayerProfile";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";

vi.mock("../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getPlayerDetails: vi.fn() },
}));

// The header is under test; the detail view below it has its own tests
vi.mock("../components/PlayerDetailView", () => ({
  default: ({ season, mmrType }) => (
    <div data-testid="detail-view">{`season ${season} ${mmrType}p`}</div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderProfile = (url = "/player/vanilla%20lake?season=3&mmrType=12") =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/player/:playerName" element={<PlayerProfile />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </SettingsProvider>,
  );

describe("PlayerProfile header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loungeApi.getPlayerDetails.mockResolvedValue({
      name: "Vanilla Lake",
      rank: "Gold",
      overallRank: 588,
      mmr: 7024,
    });
  });

  it("uses the player's name as the heading, with rank, placing and MMR under it", async () => {
    renderProfile();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Vanilla Lake" }),
    ).toBeTruthy();
    expect(screen.getByText(/· #588 · 7,024 MMR/).textContent).toBe(
      "Gold · #588 · 7,024 MMR",
    );
    expect(screen.queryByText("Player Profile")).toBeNull();
  });

  it("switches ladder with the 12p / 24p toggle", async () => {
    renderProfile();
    await screen.findByRole("heading", { level: 1, name: "Vanilla Lake" });

    const ladder = screen.getByRole("group", { name: "Ladder" });
    expect(
      screen.getByRole("button", { name: "12p" }).getAttribute("aria-pressed"),
    ).toBe("true");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "24p" }));
    });

    expect(ladder).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe(
      "/player/vanilla%20lake?season=3&mmrType=24",
    );
  });

  it("has no ladder toggle before season 2", async () => {
    renderProfile("/player/vanilla%20lake?season=1");
    await screen.findByRole("heading", { level: 1 });

    expect(screen.queryByRole("group", { name: "Ladder" })).toBeNull();
  });

  it("offers favourite, copy link and compare as compact actions", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderProfile();
    await screen.findByRole("heading", { level: 1, name: "Vanilla Lake" });

    fireEvent.click(
      screen.getByRole("button", { name: "Add Vanilla Lake to favourites" }),
    );
    expect(JSON.parse(localStorage.getItem("favouritePlayers"))).toEqual([
      "Vanilla Lake",
    ]);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByText("Link copied to clipboard")).toBeTruthy();

    expect(
      screen
        .getByRole("link", { name: "Compare Vanilla Lake with other players" })
        .getAttribute("href"),
    ).toBe("/compare?names=Vanilla+Lake&season=3&mmrType=12");
  });
});
