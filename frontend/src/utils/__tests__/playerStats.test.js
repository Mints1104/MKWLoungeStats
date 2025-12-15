import { describe, it, expect } from "vitest";
import { calculateEventStats } from "../playerStats";

describe("playerStats", () => {
  describe("calculateEventStats", () => {
    it("should calculate stats correctly for mixed events", () => {
      const events = [
        { numPlayers: 12, score: 80, mmrDelta: 10 },
        { numPlayers: 12, score: 70, mmrDelta: -5 },
        { numPlayers: 24, score: 100, mmrDelta: 15 },
        { numPlayers: 24, score: 90, mmrDelta: 8 },
      ];

      const result = calculateEventStats(events);

      expect(result.twelveCount).toBe(2);
      expect(result.twentyFourCount).toBe(2);
      expect(result.avg12).toBe(75); // (80 + 70) / 2
      expect(result.avg24).toBe(95); // (100 + 90) / 2
      expect(result.winRate12).toBe(0.5); // 1 win out of 2
      expect(result.winRate24).toBe(1); // 2 wins out of 2
    });

    it("should handle empty or null events", () => {
      expect(calculateEventStats(null)).toEqual({
        twelveCount: 0,
        twentyFourCount: 0,
        avg12: null,
        avg24: null,
        winRate12: null,
        winRate24: null,
      });

      expect(calculateEventStats([])).toEqual({
        twelveCount: 0,
        twentyFourCount: 0,
        avg12: null,
        avg24: null,
        winRate12: null,
        winRate24: null,
      });
    });

    it("should handle events with missing scores", () => {
      const events = [
        { numPlayers: 12, mmrDelta: 10 },
        { numPlayers: 12, score: 80, mmrDelta: 5 },
      ];

      const result = calculateEventStats(events);

      expect(result.twelveCount).toBe(2);
      expect(result.avg12).toBe(80); // Only count valid scores
      expect(result.winRate12).toBe(1); // Both positive deltas
    });

    it("should calculate win rates correctly", () => {
      const events = [
        { numPlayers: 12, score: 80, mmrDelta: 10 },
        { numPlayers: 12, score: 60, mmrDelta: -10 },
        { numPlayers: 12, score: 70, mmrDelta: 0 }, // Zero delta = loss
        { numPlayers: 12, score: 85, mmrDelta: 5 },
      ];

      const result = calculateEventStats(events);

      expect(result.winRate12).toBe(0.5); // 2 wins out of 4
    });
  });
});
