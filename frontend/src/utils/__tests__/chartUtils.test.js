import { describe, it, expect } from "vitest";
import { calculateScoreDistribution } from "../chartUtils";

describe("chartUtils", () => {
  describe("calculateScoreDistribution", () => {
    it("should create correct score distribution for all events", () => {
      const events = [
        { score: 55, numPlayers: 12 },
        { score: 65, numPlayers: 12 },
        { score: 75, numPlayers: 12 },
        { score: 85, numPlayers: 12 },
        { score: 95, numPlayers: 12 },
      ];

      const result = calculateScoreDistribution(events, "all");

      expect(result).toHaveLength(10); // 10 bins from 0-100
      expect(result[5].range).toBe("50-60");
      expect(result[5].count).toBe(1); // One score in 50-60 range
      expect(result[6].count).toBe(1); // One score in 60-70 range
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

      expect(result1).toHaveLength(10);
      expect(result2).toHaveLength(10);

      // All bins should have 0 count
      expect(result1.every((bin) => bin.count === 0)).toBe(true);
      expect(result2.every((bin) => bin.count === 0)).toBe(true);
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
