import { describe, it, expect } from "vitest";
import {
  calculateComparisonMmrData,
  calculateGradientStops,
  calculateMmrHistoryData,
  calculateScoreDistribution,
  findPeakPoint,
  getVisibleRankLines,
  comparisonSeriesKey,
  MMR_CHART_Y_DOMAIN,
} from "../chartUtils";

describe("chartUtils", () => {
  describe("calculateComparisonMmrData", () => {
    it("keys each series by player index, oldest event first", () => {
      const players = [
        // mmrChanges arrive newest first
        { name: "J.R.", mmrChanges: [{ newMmr: 1200 }, { newMmr: 1100 }] },
        { name: "Amy", mmrChanges: [{ newMmr: 900 }] },
      ];

      expect(calculateComparisonMmrData(players)).toEqual([
        {
          event: 1,
          [comparisonSeriesKey(0)]: 1100,
          [comparisonSeriesKey(1)]: 900,
        },
        { event: 2, [comparisonSeriesKey(0)]: 1200 },
      ]);
    });

    it("never uses a player name as a data key", () => {
      const data = calculateComparisonMmrData([
        { name: "J.R.", mmrChanges: [{ newMmr: 1000 }] },
      ]);

      expect(Object.keys(data[0])).not.toContain("J.R.");
    });

    it("returns an empty array without players", () => {
      expect(calculateComparisonMmrData([])).toEqual([]);
      expect(calculateComparisonMmrData(null)).toEqual([]);
    });
  });

  describe("calculateScoreDistribution", () => {
    it("should create correct score distribution for all events", () => {
      const events = [
        { reason: "Table", score: 10, numPlayers: 12 },
        { reason: "Table", score: 30, numPlayers: 12 },
        { reason: "Table", score: 55, numPlayers: 12 },
        { reason: "Table", score: 85, numPlayers: 12 },
        { reason: "Table", score: 115, numPlayers: 12 },
        { reason: "Penalty", score: 999, numPlayers: 12 },
      ];

      const result = calculateScoreDistribution(events, "all");

      expect(result).toHaveLength(6); // 6 bins defined in chartUtils
      expect(result[0].count).toBe(2); // 0-40
      expect(result[1].count).toBe(1); // 41-60
      expect(result[2].count).toBe(0); // 61-80
      expect(result[3].count).toBe(1); // 81-100
      expect(result[4].count).toBe(1); // 101-120
      expect(result[5].count).toBe(0); // 121+
    });

    it("should filter by player count", () => {
      const events = [
        { reason: "Table", score: 55, numPlayers: 12 },
        { reason: "Table", score: 65, numPlayers: 24 },
        { reason: "Table", score: 75, numPlayers: 12 },
      ];

      const result12p = calculateScoreDistribution(events, "12");
      const result24p = calculateScoreDistribution(events, "24");

      // Should count correctly based on filter
      const total12 = result12p.reduce((sum, bin) => sum + bin.count, 0);
      const total24 = result24p.reduce((sum, bin) => sum + bin.count, 0);

      expect(total12).toBe(2);
      expect(total24).toBe(1);
    });

    it("should leave out tables that were later deleted", () => {
      const events = [
        { reason: "TableDelete", changeId: 7, mmrDelta: 80 },
        { reason: "Table", changeId: 7, score: 30, numPlayers: 24 },
        { reason: "Table", changeId: 8, score: 95, numPlayers: 24 },
      ];

      const result = calculateScoreDistribution(events, "all");

      expect(result[0].count).toBe(0); // 0-40: the deleted table's 30
      expect(result[3].count).toBe(1); // 81-100
    });

    it("should handle empty or null events", () => {
      const result1 = calculateScoreDistribution(null, "all");
      const result2 = calculateScoreDistribution([], "all");

      const zeroBins = [
        { range: "0-40", min: 0, max: 40, count: 0 },
        { range: "41-60", min: 41, max: 60, count: 0 },
        { range: "61-80", min: 61, max: 80, count: 0 },
        { range: "81-100", min: 81, max: 100, count: 0 },
        { range: "101-120", min: 101, max: 120, count: 0 },
        { range: "121+", min: 121, max: Infinity, count: 0 },
      ];

      expect(result1).toEqual([]);
      expect(result2).toEqual(zeroBins);
    });

    it("should ignore events without valid scores", () => {
      const events = [
        { reason: "Table", score: 55, numPlayers: 12 },
        { reason: "Table", numPlayers: 12 }, // Missing score
        { reason: "Table", score: null, numPlayers: 12 },
        { reason: "Table", score: NaN, numPlayers: 12 },
      ];

      const result = calculateScoreDistribution(events, "all");
      const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);

      // Current implementation only counts numeric scores that fit a defined range.
      // `null` is coerced to 0, while `undefined` and `NaN` are ignored.
      expect(totalCount).toBe(2);
    });
  });

  describe("MMR_CHART_Y_DOMAIN", () => {
    it("should clamp the Y-axis floor to 0", () => {
      const [minDomain] = MMR_CHART_Y_DOMAIN;
      expect(minDomain(0)).toBe(0);
      expect(minDomain(25)).toBe(0);
      expect(minDomain(50)).toBe(0);
      expect(minDomain(100)).toBe(50);
    });

    it("should add padding above the data maximum", () => {
      const [, maxDomain] = MMR_CHART_Y_DOMAIN;
      expect(maxDomain(1000)).toBe(1050);
    });
  });
});

describe("MMR history chart data", () => {
  const colorFor = (mmr) => ({ color: mmr >= 6000 ? "gold" : "silver" });

  // Newest first, as the API sends mmrChanges
  const changes = [
    { reason: "TableDelete", changeId: 2, newMmr: 6100, mmrDelta: 50, time: "2026-07-04T00:00:00Z" },
    { reason: "Strike", changeId: 9, newMmr: 6050, mmrDelta: -100, time: "2026-07-03T00:00:00Z" },
    { reason: "Table", changeId: 2, newMmr: 6150, mmrDelta: -50, score: 40, rank: 9, tier: "B", numPlayers: 24, numTeams: 12, time: "2026-07-02T00:00:00Z" },
    { reason: "Table", changeId: 1, newMmr: 5950, mmrDelta: 30, score: 90, rank: 2, tier: "A", numPlayers: 24, numTeams: 24, time: "2026-07-01T00:00:00Z" },
  ];

  it("keeps what the tooltip and markers need, oldest first", () => {
    const { mmrHistoryData } = calculateMmrHistoryData(changes, colorFor, "p1");

    expect(mmrHistoryData.map((point) => point.reason)).toEqual([
      "Table",
      "Table",
      "Strike",
      "TableDelete",
    ]);
    expect(mmrHistoryData[0]).toEqual({
      event: 1,
      time: Date.parse("2026-07-01T00:00:00Z"),
      mmr: 5950,
      rankColor: "silver",
      reason: "Table",
      mmrDelta: 30,
      score: 90,
      placement: 2,
      tier: "A",
      numPlayers: 24,
      numTeams: 24,
      tableDeleted: false,
    });
    expect(mmrHistoryData[1].tableDeleted).toBe(true);
  });

  it("places gradient stops by index, or by an x value such as time", () => {
    const points = [
      { rankColor: "silver", time: 0 },
      { rankColor: "gold", time: 10 },
      { rankColor: "gold", time: 100 },
    ];

    expect(calculateGradientStops(points)).toEqual([
      { offset: "0%", color: "silver" },
      { offset: "49.9%", color: "silver" },
      { offset: "50%", color: "gold" },
      { offset: "100%", color: "gold" },
    ]);
    expect(calculateGradientStops(points, "time")).toEqual([
      { offset: "0%", color: "silver" },
      { offset: "9.9%", color: "silver" },
      { offset: "10%", color: "gold" },
      { offset: "100%", color: "gold" },
    ]);
  });

  it("finds the latest peak", () => {
    const points = [{ mmr: 10 }, { mmr: 30, id: "first" }, { mmr: 30, id: "last" }, { mmr: 5 }];

    expect(findPeakPoint(points).id).toBe("last");
    expect(findPeakPoint([])).toBeNull();
  });

  it("only draws rank lines inside the plotted MMR range", () => {
    const thresholds = [
      { name: "Iron", min: 0 },
      { name: "Silver", min: 4000 },
      { name: "Gold", min: 6000 },
      { name: "Platinum", min: 8000 },
    ];

    expect(
      getVisibleRankLines(thresholds, [{ mmr: 5100 }, { mmr: 7200 }]).map(
        (rank) => rank.name,
      ),
    ).toEqual(["Gold"]);
    expect(getVisibleRankLines(thresholds, [])).toEqual([]);
  });
});
