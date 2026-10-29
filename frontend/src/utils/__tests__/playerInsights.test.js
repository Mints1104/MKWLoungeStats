import { describe, it, expect } from "vitest";
import {
  calculateBreakdown,
  calculateHeadToHead,
  calculateHeadToHeadPairs,
  calculatePartners,
  calculateStreaksAndForm,
} from "../playerInsights";

// Newest first, as the API sends mmrChanges
const table = (changeId, mmrDelta, extra = {}) => ({
  reason: "Table",
  changeId,
  mmrDelta,
  newMmr: 5000,
  score: 70,
  rank: 3,
  time: `2026-10-${String(changeId).padStart(2, "0")}T12:00:00Z`,
  ...extra,
});

describe("calculateStreaksAndForm", () => {
  it("finds the current and longest streaks", () => {
    // newest -> oldest: W W L L L W
    const events = [
      table(6, 20),
      table(5, 15),
      table(4, -10),
      table(3, -5),
      table(2, -8),
      table(1, 12),
    ];

    const result = calculateStreaksAndForm(events);

    expect(result.current).toEqual({ type: "win", length: 2 });
    expect(result.longestWin).toBe(2);
    expect(result.longestLoss).toBe(3);
    expect(result.form).toEqual(["W", "W", "L", "L", "L", "W"]);
  });

  it("ignores penalties and deleted tables, and treats 0 MMR as a loss", () => {
    const events = [
      { reason: "Strike", changeId: 99, mmrDelta: -100, newMmr: 4800 },
      { reason: "TableDelete", changeId: 5, mmrDelta: 30, newMmr: 4900 },
      table(5, -30),
      table(4, 0),
      table(3, 10),
    ];

    const result = calculateStreaksAndForm(events);

    expect(result.form).toEqual(["L", "W"]);
    expect(result.current).toEqual({ type: "loss", length: 1 });
  });

  it("caps form at the last 10 events and finds the peak MMR", () => {
    const events = Array.from({ length: 14 }, (_, index) =>
      table(14 - index, 10, { newMmr: index === 6 ? 9000 : 5000 }),
    );

    const result = calculateStreaksAndForm(events);

    expect(result.form).toHaveLength(10);
    expect(result.peak).toEqual({ mmr: 9000, time: events[6].time });
  });

  it("handles a player with no table events", () => {
    expect(calculateStreaksAndForm([])).toEqual({
      current: null,
      longestWin: 0,
      longestLoss: 0,
      form: [],
      peak: null,
    });
  });
});

describe("calculatePartners", () => {
  it("groups results by partner, most frequent first", () => {
    const events = [
      table(4, 20, { score: 90, partnerIds: [7, 8], partnerScores: [80, 60] }),
      table(3, -10, { score: 50, partnerIds: [7], partnerScores: [40] }),
      table(2, 30, { score: 100, partnerIds: [9], partnerScores: [70] }),
      table(1, 5, { score: 70 }),
    ];

    const [first, ...rest] = calculatePartners(events);

    expect(first).toEqual({
      playerId: 7,
      events: 2,
      wins: 1,
      winRate: 0.5,
      avgScore: 70,
      avgPartnerScore: 60,
      netMmr: 10,
      lastTableId: 4,
    });
    expect(rest.map((partner) => partner.playerId)).toEqual([8, 9]);
  });

  it("leaves out deleted tables", () => {
    const events = [
      { reason: "TableDelete", changeId: 2, mmrDelta: 10 },
      table(2, -10, { partnerIds: [7], partnerScores: [40] }),
    ];

    expect(calculatePartners(events)).toEqual([]);
  });
});

describe("calculateHeadToHead", () => {
  const amy = {
    playerId: 1,
    mmrChanges: [
      table(5, 10, { rank: 2, partnerIds: [2], score: 90 }), // teammates
      table(4, 10, { rank: 1, score: 100 }),
      table(3, -10, { rank: 6, score: 60 }),
      table(2, 0, { rank: 4, score: 70 }),
      table(1, 10, { rank: 1, score: 99 }), // Zed wasn't there
    ],
  };
  const zed = {
    playerId: 2,
    mmrChanges: [
      table(5, 10, { rank: 2, partnerIds: [1] }),
      table(4, -10, { rank: 5, score: 80 }),
      table(3, 10, { rank: 2, score: 90 }),
      table(2, 0, { rank: 4, score: 75 }),
    ],
  };

  it("counts who placed ahead in shared tables", () => {
    expect(calculateHeadToHead(amy, zed)).toEqual({
      meetings: 3,
      aAhead: 1,
      bAhead: 1,
      ties: 1,
      teammates: 1,
      aAvgScore: (100 + 60 + 70) / 3,
      bAvgScore: (80 + 90 + 75) / 3,
      lastTableId: 5,
    });
  });

  it("is symmetric", () => {
    const reversed = calculateHeadToHead(zed, amy);

    expect(reversed.aAhead).toBe(1);
    expect(reversed.bAhead).toBe(1);
    expect(reversed.meetings).toBe(3);
  });

  it("builds every pair in the order entered", () => {
    const cat = { playerId: 3, mmrChanges: [] };

    const pairs = calculateHeadToHeadPairs([amy, zed, cat]);

    expect(pairs.map(({ a, b }) => [a.playerId, b.playerId])).toEqual([
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
    expect(pairs[1].record.meetings).toBe(0);
  });
});

describe("calculateBreakdown", () => {
  const events = [
    table(7, 20, { tier: "A", score: 90, rank: 2, numPlayers: 24, numTeams: 12 }),
    table(6, -10, { tier: "BC", score: 60, rank: 8, numPlayers: 24, numTeams: 24 }),
    table(5, 15, { tier: "BC", score: 80, rank: 3, numPlayers: 24, numTeams: 24 }),
    table(4, -5, { tier: "BC", score: 70, rank: 6, numPlayers: 24, numTeams: 8 }),
    { reason: "TableDelete", changeId: 3, mmrDelta: 40 },
    table(3, -40, { tier: "SQ", score: 10, rank: 12, numPlayers: 24, numTeams: 12 }),
    { reason: "Strike", changeId: 99, mmrDelta: -100 },
  ];

  it("groups by tier, most events first, leaving out deleted tables", () => {
    const rows = calculateBreakdown(events, "tier");

    expect(rows.map((row) => row.key)).toEqual(["BC", "A"]);
    expect(rows[0]).toEqual({
      key: "BC",
      label: "BC",
      events: 3,
      wins: 1,
      winRate: 1 / 3,
      avgScore: 70,
      avgPlacement: (8 + 3 + 6) / 3,
      netMmr: 0,
      share: 1,
    });
    expect(rows[1].share).toBeCloseTo(1 / 3);
  });

  it("groups by format, FFA first then by team size", () => {
    const rows = calculateBreakdown(events, "format");

    expect(rows.map((row) => [row.key, row.events])).toEqual([
      ["FFA", 2],
      ["2v2", 1],
      ["3v3", 1],
    ]);
  });

  it("can split formats by player count for pre-split seasons", () => {
    const rows = calculateBreakdown(
      [
        table(2, 10, { tier: "A", numPlayers: 24, numTeams: 24 }),
        table(1, 10, { tier: "A", numPlayers: 12, numTeams: 6 }),
      ],
      "format",
      { splitByPlayerCount: true },
    );

    expect(rows.map((row) => row.key)).toEqual(["12p 2v2", "24p FFA"]);
  });

  it("returns no rows without table events", () => {
    expect(calculateBreakdown([], "tier")).toEqual([]);
  });
});
