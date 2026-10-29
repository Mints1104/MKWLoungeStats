import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TableInfo from "../TableInfo";
import { loungeApi } from "../api/loungeApi";
import { clearRankThresholdCache } from "../hooks/useRankThresholds";

vi.mock("../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: { getTableById: vi.fn(), getPlayerStats: vi.fn() },
}));

const table = {
  id: 555,
  season: 3,
  game: "mkworld12p",
  format: "FFA",
  tier: "B",
  numPlayers: 12,
  url: "/TableImage/555.png",
  createdOn: "2026-10-01T12:00:00Z",
  verifiedOn: "2026-10-01T13:00:00Z",
  teams: [
    {
      rank: 1,
      scores: [
        {
          playerId: 1,
          playerName: "Amy",
          playerCountryCode: "JP",
          score: 101,
          prevMmr: 10000,
          newMmr: 10100,
          delta: 100,
        },
      ],
    },
    {
      rank: 2,
      scores: [
        {
          playerId: 2,
          playerName: "Zed",
          playerCountryCode: null,
          score: 60,
          prevMmr: 9000,
          newMmr: 8950,
          delta: -50,
        },
      ],
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderTable = (id = "555") =>
  render(
    <MemoryRouter initialEntries={[`/table/${id}`]}>
      <Routes>
        <Route path="/table/:tableId" element={<TableInfo />} />
        <Route path="/player/:playerName" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("TableInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRankThresholdCache();
    loungeApi.getPlayerStats.mockRejectedValue(new Error("offline"));
  });

  it("shows the table's standings and MMR changes", async () => {
    loungeApi.getTableById.mockResolvedValue(table);

    renderTable();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Table #555" }),
    ).toBeTruthy();
    expect(loungeApi.getTableById).toHaveBeenCalledWith("555", expect.anything());
    expect(screen.getByText("Amy")).toBeTruthy();
    expect(screen.getByText("+100").className).toBe("positive");
    expect(screen.getByText("-50").className).toBe("negative");
    expect(screen.getByAltText("Lounge table image for table #555").src).toBe(
      "https://lounge.mkcentral.com/TableImage/555.png",
    );
  });

  it("links players to their profile for the table's season and ladder", async () => {
    loungeApi.getTableById.mockResolvedValue(table);

    renderTable();

    const profileButton = await screen.findByRole("button", {
      name: "View profile for Zed",
    });
    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByTestId("location").textContent).toBe(
      "/player/Zed?season=3&mmrType=12",
    );
  });

  it("colours MMR with the rank thresholds the API publishes", async () => {
    loungeApi.getTableById.mockResolvedValue(table);
    // A made-up ladder where 10100 is Grandmaster, unlike the bundled tables
    loungeApi.getPlayerStats.mockResolvedValue({
      ranks: { Iron: 0, Grandmaster: 10050 },
    });

    renderTable();

    await waitFor(() =>
      expect(screen.getByText("10100").style.color).toBe("rgb(163, 2, 44)"),
    );
    expect(loungeApi.getPlayerStats).toHaveBeenCalledWith({
      season: 3,
      game: "mkworld12p",
    });
  });

  it("shows the API's error for a missing table", async () => {
    const notFound = new Error("No lounge table found for that ID");
    notFound.status = 404;
    loungeApi.getTableById.mockRejectedValue(notFound);

    renderTable("999");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No lounge table found for that ID",
    );
  });
});
