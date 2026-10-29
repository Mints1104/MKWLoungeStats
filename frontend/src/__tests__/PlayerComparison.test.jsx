import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  },
}));

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
  render(
    <SettingsProvider>
      <PlayerComparison />
    </SettingsProvider>,
  );
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
