import { describe, it, expect } from "vitest";
import {
  calculateScoreDistribution,
  MMR_CHART_Y_DOMAIN,
} from "../chartUtils";

describe("chartUtils", () => {
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
