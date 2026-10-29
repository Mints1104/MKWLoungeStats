import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PlayerInfo from "../PlayerInfo";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";
import { clearSuggestionCache } from "../hooks/usePlayerSuggestions";

vi.mock("../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getLeaderboard: vi.fn() },
}));

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderHome = () =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<PlayerInfo />} />
          <Route path="/player/:playerName" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

describe("PlayerInfo search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    clearSuggestionCache();
    loungeApi.getLeaderboard.mockResolvedValue({ data: [], totalCount: 0 });
  });

  it("opens the player's profile, which is the shareable link", async () => {
    renderHome();

    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "  Guti " },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Get Player Info" }));
    });

    expect(screen.getByTestId("location").textContent).toBe(
      "/player/Guti?season=3&mmrType=24",
    );
  });

  it("keeps the season and MMR type picked earlier in the session", async () => {
    sessionStorage.setItem("playerInfoSeason", "2");
    sessionStorage.setItem("playerInfoMmrType", "12");
    renderHome();

    expect(screen.getByLabelText("Select Season").value).toBe("2");
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Guti" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Get Player Info" }));
    });

    expect(screen.getByTestId("location").textContent).toBe(
      "/player/Guti?season=2&mmrType=12",
    );
  });

  it("suggests names as you type and opens the one picked", async () => {
    loungeApi.getLeaderboard.mockResolvedValue({
      data: [
        { name: "kromame", mmr: 7024, countryCode: "JP" },
        { name: "KronoX", mmr: 6500, countryCode: "US" },
      ],
      totalCount: 2,
    });
    renderHome();

    const input = screen.getByRole("combobox", { name: "Player name" });
    fireEvent.change(input, { target: { value: "kro" } });

    expect(await screen.findByRole("option", { name: /KronoX/ })).toBeTruthy();
    expect(loungeApi.getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ search: "kro", season: 3, mmrType: 24 }),
      expect.anything(),
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toMatch(/-1$/);

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(screen.getByTestId("location").textContent).toBe(
      "/player/KronoX?season=3&mmrType=24",
    );
  });

  it("doesn't search for a single character", async () => {
    renderHome();

    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "k" },
    });
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(loungeApi.getLeaderboard).not.toHaveBeenCalled();
  });

  it("lists recent searches and favourites as profile links", () => {
    localStorage.setItem("recentPlayerSearches", JSON.stringify(["Akagane"]));
    localStorage.setItem("favouritePlayers", JSON.stringify(["Guti", "L1am"]));
    renderHome();

    expect(screen.getByRole("link", { name: "Akagane" }).getAttribute("href")).toBe(
      "/player/Akagane?season=3&mmrType=24",
    );
    expect(screen.getByRole("link", { name: /Guti/ }).getAttribute("href")).toBe(
      "/player/Guti?season=3&mmrType=24",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Guti from favourites" }),
    );

    expect(screen.queryByRole("link", { name: /Guti/ })).toBeNull();
    expect(JSON.parse(localStorage.getItem("favouritePlayers"))).toEqual([
      "L1am",
    ]);
  });
});
