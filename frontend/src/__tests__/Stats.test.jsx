import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Stats from "../Stats";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";

vi.mock("recharts", () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const empty = () => null;
  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    LineChart: passthrough,
    Bar: passthrough,
    Line: empty,
    XAxis: empty,
    YAxis: empty,
    Tooltip: empty,
    CartesianGrid: empty,
    Legend: empty,
    Cell: empty,
  };
});

vi.mock("../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getPlayerStats: vi.fn() },
}));

const stats = {
  totalPlayers: 1234,
  totalMogis: 5678,
  averageMmr: 7000,
  medianMmr: 6800,
  divisionData: [
    { tier: "Iron", count: 100 },
    { tier: "Gold", count: 900 },
    { tier: "Master", count: 234 },
  ],
  divisionsToTier: { Q: ["Iron", "Gold", "Master"] },
  activityData: {
    formatData: { FFA: 40, "2v2": 10 },
    tierActivity: { A: 30, B: 20 },
    dayOfWeekActivity: { Monday: 7, Tuesday: 9 },
    dailyActivity: {
      "2026-06-22": { Total: 3 },
      "2026-06-23": { Total: 4 },
    },
  },
  countryData: {
    JP: {
      playerTotal: 400,
      totalAverageMmr: 7500,
      topSixMmr: 14000,
      topSixPlayers: [{ name: "Akagane" }, { name: "Guti" }],
    },
  },
  ranks: { Iron: 0, Gold: 6000, Master: 14500 },
};

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderStats = () =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={["/stats"]}>
        <Routes>
          <Route path="/stats" element={<Stats />} />
          <Route path="/player/:playerName" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );

describe("Stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    loungeApi.getPlayerStats.mockResolvedValue(stats);
  });

  it("shows the summary and players per rank for the current season", async () => {
    renderStats();

    expect(await screen.findByText("1,234")).toBeTruthy();
    expect(screen.getByText("5,678")).toBeTruthy();
    expect(loungeApi.getPlayerStats).toHaveBeenCalledWith(
      { season: 3, game: "mkworld24p" },
      expect.anything(),
    );

    const rankTable = screen.getByRole("table", {
      name: /Division breakdown/,
    });
    expect(within(rankTable).getByText("Gold")).toBeTruthy();
    expect(within(rankTable).getByText("900")).toBeTruthy();
  });

  it("requests the mkworld ladder for pre-split seasons", async () => {
    renderStats();
    await screen.findByText("1,234");

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Select Season"), {
        target: { value: "1" },
      });
    });

    expect(loungeApi.getPlayerStats).toHaveBeenLastCalledWith(
      { season: 1, game: "mkworld" },
      expect.anything(),
    );
  });

  it("links top players by country to their profile", async () => {
    renderStats();

    const profileButton = await screen.findByRole("button", {
      name: "View profile for Guti",
    });
    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByTestId("location").textContent).toBe(
      "/player/Guti?season=3&mmrType=24",
    );
  });

  it("shows an error when the stats cannot be loaded", async () => {
    loungeApi.getPlayerStats.mockRejectedValue(new Error("Failed to fetch"));

    renderStats();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Failed to fetch",
    );
  });
});
