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
    noSQAverageScore: 76.5,
    partnerAverage: 78,
    noSQPartnerAverage: 72.25,
    eventsPlayed: 3,
    winRate: 0.55,
    mmrChanges: [
      {
        changeId: 1,
        reason: "Table",
        numPlayers: 12,
        numTeams: 12,
        tier: "A",
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
        tier: "BC",
        score: 70,
        partnerScores: [72],
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
        tier: "SQ",
        score: 85,
        partnerScores: [90, 96],
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

  it("restores the sort order from storage and persists changes", async () => {
    sessionStorage.setItem("playerSortMethodPref", "gain");

    const { unmount } = render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    const sortSelect = await screen.findByLabelText("Sort Events");
    expect(sortSelect.value).toBe("gain");

    fireEvent.change(sortSelect, { target: { value: "score_desc" } });

    await waitFor(() => {
      expect(sessionStorage.getItem("playerSortMethodPref")).toBe("score_desc");
    });

    // Remounting (e.g. after navigating to a table and back) keeps the choice
    unmount();
    render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    expect((await screen.findByLabelText("Sort Events")).value).toBe(
      "score_desc",
    );
  });

  it("ignores an unrecognised stored sort order", async () => {
    sessionStorage.setItem("playerSortMethodPref", "bogus");

    render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    expect((await screen.findByLabelText("Sort Events")).value).toBe("recent");
  });

  it("builds tiers from recent events and persists tier filter updates", async () => {
    sessionStorage.setItem("playerTierFilterPref", JSON.stringify(["A"]));

    render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    const tierButton = await screen.findByRole("button", { name: /tier/i });
    fireEvent.click(tierButton);

    const aCheckbox = await screen.findByRole("checkbox", { name: "A" });
    const bcCheckbox = await screen.findByRole("checkbox", { name: "BC" });

    expect(aCheckbox.checked).toBe(false);
    expect(bcCheckbox.checked).toBe(true);
    expect(screen.queryByRole("checkbox", { name: "X" })).toBeNull();

    fireEvent.click(aCheckbox);

    await waitFor(() => {
      expect(sessionStorage.getItem("playerTierFilterPref")).toBe("[]");
    });

    expect(aCheckbox.checked).toBe(true);
  });
});

describe("PlayerDetailView noSQ stats", () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigateMock.mockReset();
  });

  // Both the overall rows and the recent-events cards render as
  // <span class="recent-stat-label">…</span><span class="recent-stat-value">…</span>
  const valueFor = (label) => screen.getByText(label).parentElement.textContent;

  it("renders the noSQ averages from the player payload in the overall stats card", async () => {
    render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    await screen.findByText("No SQ Average Score");

    expect(valueFor("No SQ Average Score")).toContain("76.50");
    expect(valueFor("No SQ Partner Average")).toContain("72.25");
  });

  it("falls back to N/A when the payload omits noSQPartnerAverage", async () => {
    const details = makePlayerDetails();
    delete details.noSQPartnerAverage;

    render(<PlayerDetailView playerDetails={details} season={1} mmrType={24} />);

    await screen.findByText("No SQ Partner Average");

    expect(valueFor("No SQ Partner Average")).toContain("N/A");
  });

  it("computes the recent noSQ averages from the displayed events only", async () => {
    render(
      <PlayerDetailView
        playerDetails={makePlayerDetails()}
        season={1}
        mmrType={24}
      />,
    );

    await screen.findByText("No SQ avg");

    // Scores 80 / 70 / 85, the 85 being an SQ event
    expect(valueFor("Avg score")).toContain("78.33");
    expect(valueFor("No SQ avg")).toContain("75.00");

    // Partner scores [72] (non-SQ) and [90, 96] (SQ)
    expect(valueFor("PAvg score")).toContain("86.00");
    expect(valueFor("No SQ PAvg")).toContain("72.00");
  });
});
