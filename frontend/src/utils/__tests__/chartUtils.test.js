import { describe, it, expect } from "vitest";
import { calculateScoreDistribution } from "../chartUtils";

describe("chartUtils", () => {
  describe("calculateScoreDistribution", () => {
    it("should create correct score distribution for all events", () => {
      const events = [
        { score: 10, numPlayers: 12 },
        { score: 30, numPlayers: 12 },
        { score: 55, numPlayers: 12 },
        { score: 85, numPlayers: 12 },
        { score: 115, numPlayers: 12 },
      ];

      const result = calculateScoreDistribution(events, "all");

      expect(result).toHaveLength(6); // 6 bins defined in chartUtils
      expect(result[0].count).toBe(1); // 0-20
      expect(result[1].count).toBe(1); // 21-40
      expect(result[2].count).toBe(1); // 41-60
      expect(result[3].count).toBe(0); // 61-80
      expect(result[4].count).toBe(1); // 81-100
      expect(result[5].count).toBe(1); // 101-120
    });

    it("should filter by player count", () => {
      const events = [
        { score: 55, numPlayers: 12 },
        { score: 65, numPlayers: 24 },
        { score: 75, numPlayers: 12 },
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

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it("should ignore events without valid scores", () => {
      const events = [
        { score: 55, numPlayers: 12 },
        { numPlayers: 12 }, // Missing score
        { score: null, numPlayers: 12 },
        { score: NaN, numPlayers: 12 },
      ];

      const result = calculateScoreDistribution(events, "all");
      const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);

      expect(totalCount).toBe(1); // Only one valid score
    });
  });
});
