import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import PlayerComparison from "../PlayerComparison";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import { loungeApi } from "../api/loungeApi";

vi.mock("recharts", () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const empty = () => null;
  return {
    LineChart: passthrough,
    ResponsiveContainer: passthrough,
    Line: empty,
    XAxis: empty,
    YAxis: empty,
    CartesianGrid: empty,
    Tooltip: empty,
    Legend: empty,
  };
});

vi.mock("../api/loungeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  loungeApi: {
    comparePlayers: vi.fn(),
    // Rank thresholds fall back to the bundled tables
    getPlayerStats: vi.fn(() => Promise.reject(new Error("offline"))),
    // Name autocomplete finds nothing
    getLeaderboard: vi.fn(async () => ({ data: [], totalCount: 0 })),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

const renderComparison = (url = "/compare") =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[url]}>
        <PlayerComparison />
        <LocationProbe />
      </MemoryRouter>
    </SettingsProvider>,
  );

const player = (name, playerId, extra = {}) => ({
  name,
  playerId,
  mmr: 10000,
  maxMmr: 10500,
  rank: "Sapphire",
  overallRank: playerId,
  eventsPlayed: 20,
  winRate: 0.55,
  averageScore: 80,
  mmrChanges: [],
  ...extra,
});

async function compare(names) {
  renderComparison();
  for (let index = 2; index < names.length; index += 1) {
    fireEvent.click(screen.getByText("+ Add Player"));
  }
  names.forEach((name, index) => {
    fireEvent.change(screen.getByLabelText(`Player ${index + 1} name`), {
      target: { value: name },
    });
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Compare selected players" }),
    );
  });
}

// Two players who met in tables 1 and 2 and teamed up in table 3 (newest first)
const tableEvent = (changeId, rank, extra = {}) => ({
  reason: "Table",
  changeId,
  rank,
  score: 80,
  mmrDelta: 10,
  newMmr: 10000,
  numPlayers: 24,
  numTeams: 12,
  ...extra,
});

describe("PlayerComparison shareable links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("runs the comparison straight from a shared link", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Amy", 1),
      player("Zed", 2),
    ]);

    renderComparison("/compare?names=Amy,Zed&season=2&mmrType=12");

    await waitFor(() =>
      expect(loungeApi.comparePlayers).toHaveBeenCalledWith(
        ["Amy", "Zed"],
        2,
        12,
        expect.anything(),
      ),
    );
    expect(screen.getByLabelText("Player 1 name").value).toBe("Amy");
    expect(await screen.findByRole("button", { name: "Copy link" })).toBeTruthy();
  });

  it("prefills one name from a profile's compare link without running", () => {
    renderComparison("/compare?names=Amy&season=3&mmrType=24");

    expect(screen.getByLabelText("Player 1 name").value).toBe("Amy");
    expect(screen.getByLabelText("Player 2 name").value).toBe("");
    expect(loungeApi.comparePlayers).not.toHaveBeenCalled();
  });

  it("writes the compared names into the URL", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Amy", 1),
      player("Zed", 2),
    ]);

    await compare(["Amy", "Zed"]);

    expect(screen.getByTestId("location").textContent).toBe(
      "/compare?names=Amy%2CZed&season=3&mmrType=24",
    );
  });

  it("shows the head-to-head record from shared tables", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Amy", 1, {
        mmrChanges: [
          tableEvent(3, 2, { partnerIds: [2] }),
          tableEvent(2, 1),
          tableEvent(1, 5),
        ],
      }),
      player("Zed", 2, {
        mmrChanges: [
          tableEvent(3, 2, { partnerIds: [1] }),
          tableEvent(2, 4),
          tableEvent(1, 3),
        ],
      }),
    ]);

    await compare(["Amy", "Zed"]);

    expect(screen.getByRole("heading", { name: "Head-to-head record" })).toBeTruthy();
    expect(screen.getByText("1 – 1")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Amy placed ahead 1 time, Zed 1 time",
      }),
    ).toBeTruthy();
    expect(screen.getByText("As teammates")).toBeTruthy();
  });
});

describe("PlayerComparison", () => {
  it("says which players were left out when some could not be loaded", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Amy", 1),
      { error: true, name: "Ghost", message: "Player not found" },
      player("Zed", 2),
    ]);

    await compare(["Amy", "Ghost", "Zed"]);

    expect(
      screen.getByText("Left out of the comparison (couldn't load): Ghost"),
    ).toBeTruthy();
    // The players that did load are still compared
    expect(screen.getByRole("heading", { name: /Amy/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Zed/ })).toBeTruthy();
  });

  it("names the missing players when too few are left to compare", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Amy", 1),
      { error: true, name: "Ghost", message: "Player not found" },
      { error: true, name: "Phantom", message: "Player not found" },
    ]);

    await compare(["Amy", "Ghost", "Phantom"]);

    expect(screen.getByRole("alert").textContent).toBe(
      "Could not find enough players to compare. Couldn't load: Ghost, Phantom",
    );
  });

  it("compares the names in the order typed, for the selected season and ladder", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Zed", 2),
      player("Amy", 1),
    ]);

    await compare(["Zed", "Amy"]);

    expect(loungeApi.comparePlayers).toHaveBeenLastCalledWith(
      ["Zed", "Amy"],
      3,
      24,
      expect.anything(),
    );
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["● Zed", "● Amy"]);
  });

  it("shows N/A instead of NaN% for a missing win rate", async () => {
    loungeApi.comparePlayers.mockResolvedValue([
      player("Amy", 1, { winRate: undefined }),
      player("Zed", 2),
    ]);

    await compare(["Amy", "Zed"]);

    expect(screen.getByText("Win Rate: N/A")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });
});
