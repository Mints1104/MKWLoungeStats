import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlayerDetailView from "../PlayerDetailView";

vi.mock("react-world-flags", () => ({
  default: ({ code }) => <span data-testid="flag">{code}</span>,
}));

vi.mock("recharts", () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  return {
    LineChart: passthrough,
    BarChart: passthrough,
    Bar: passthrough,
    Line: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    Tooltip: passthrough,
    Legend: passthrough,
    ResponsiveContainer: passthrough,
  };
});

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function makePlayerDetails() {
  return {
    playerId: 123,
    name: "Tester",
    countryCode: "US",
    overallRank: 99,
    rank: "Gold",
    mmr: 6400,
    maxMmr: 7000,
    averageScore: 80,
    partnerAverage: 78,
    eventsPlayed: 3,
    winRate: 0.55,
    mmrChanges: [
      {
        changeId: 1,
        reason: "Table",
        numPlayers: 12,
        numTeams: 12,
        score: 80,
        mmrDelta: 12,
        newMmr: 6100,
        rank: 1,
        time: 1000,
      },
      {
        changeId: 2,
        reason: "Table",
        numPlayers: 24,
        numTeams: 12,
        score: 70,
        mmrDelta: -8,
        newMmr: 6092,
        rank: 10,
        time: 1001,
      },
      {
        changeId: 3,
        reason: "Table",
        numPlayers: 24,
        numTeams: 8,
        score: 85,
        mmrDelta: 15,
        newMmr: 6107,
        rank: 3,
        time: 1002,
      },
    ],
  };
}

describe("PlayerDetailView mode filter persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigateMock.mockReset();
  });

  it("restores disabled modes from storage and persists checkbox updates", async () => {
    sessionStorage.setItem("playerGameModeFilterPref", JSON.stringify(["FFA"]));

    render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    const modeButton = await screen.findByRole("button", { name: /mode/i });
    fireEvent.click(modeButton);

    const ffaCheckbox = await screen.findByRole("checkbox", { name: "FFA" });
    const twov2Checkbox = await screen.findByRole("checkbox", { name: "2v2" });

    expect(ffaCheckbox.checked).toBe(false);
    expect(twov2Checkbox.checked).toBe(true);

    fireEvent.click(ffaCheckbox);

    await waitFor(() => {
      expect(
        JSON.parse(sessionStorage.getItem("playerGameModeFilterPref")),
      ).toEqual([]);
    });

    expect(ffaCheckbox.checked).toBe(true);
  });
});
