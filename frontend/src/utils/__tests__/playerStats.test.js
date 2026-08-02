import { describe, it, expect } from "vitest";
import {
  calculateEventStats,
  calculateRecentScoreStats,
  isSquadQueueEvent,
} from "../playerStats";

describe("playerStats", () => {
  describe("isSquadQueueEvent", () => {
    it("detects SQ events regardless of casing or padding", () => {
      expect(isSquadQueueEvent({ tier: "SQ" })).toBe(true);
      expect(isSquadQueueEvent({ tier: " sq " })).toBe(true);
    });

    it("returns false for normal tiers and missing tiers", () => {
      expect(isSquadQueueEvent({ tier: "A" })).toBe(false);
      expect(isSquadQueueEvent({ tier: "S" })).toBe(false);
      expect(isSquadQueueEvent({})).toBe(false);
      expect(isSquadQueueEvent(null)).toBe(false);
    });
  });

  describe("calculateRecentScoreStats", () => {
    it("excludes SQ events from the noSQ averages but not the blended ones", () => {
      const events = [
        { reason: "Table", tier: "A", score: 80, partnerScores: [] },
        { reason: "Table", tier: "B", score: 60, partnerScores: [] },
        { reason: "Table", tier: "SQ", score: 100, partnerScores: [90, 96] },
      ];

      const result = calculateRecentScoreStats(events);

      expect(result.avgScore).toBe(80); // (80 + 60 + 100) / 3
      expect(result.noSqAvgScore).toBe(70); // (80 + 60) / 2
      expect(result.bestScore).toBe(100);
      expect(result.partnerAvgScore).toBe(93); // (90 + 96) / 2
      expect(result.noSqPartnerAvgScore).toBeNull(); // no non-SQ partners
    });

    it("counts non-SQ team events towards the noSQ partner average", () => {
      const events = [
        // Solo-queued team event: has partners but is not Squad Queue
        { reason: "Table", tier: "S", score: 84, partnerScores: [70, 80] },
        { reason: "Table", tier: "SQ", score: 79, partnerScores: [10, 20] },
      ];

      const result = calculateRecentScoreStats(events);

      expect(result.noSqPartnerAvgScore).toBe(75); // (70 + 80) / 2
      expect(result.partnerAvgScore).toBe(45); // (70 + 80 + 10 + 20) / 4
    });

    it("ignores penalties and other non-table events", () => {
      const events = [
        { reason: "Table", tier: "A", score: 90 },
        { reason: "Strike", tier: "A", score: 999, mmrDelta: -50 },
        { reason: "Bonus", score: 999 },
      ];

      const result = calculateRecentScoreStats(events);

      expect(result.avgScore).toBe(90);
      expect(result.noSqAvgScore).toBe(90);
      expect(result.bestScore).toBe(90);
    });

    it("skips non-numeric scores rather than treating them as zero", () => {
      const events = [
        { reason: "Table", tier: "A", score: 80 },
        { reason: "Table", tier: "A" },
        { reason: "Table", tier: "A", score: null },
      ];

      const result = calculateRecentScoreStats(events);

      expect(result.avgScore).toBe(80);
      expect(result.noSqAvgScore).toBe(80);
    });

    it("returns nulls for empty, null, or table-less input", () => {
      const empty = {
        avgScore: null,
        bestScore: null,
        partnerAvgScore: null,
        noSqAvgScore: null,
        noSqPartnerAvgScore: null,
      };

      expect(calculateRecentScoreStats([])).toEqual(empty);
      expect(calculateRecentScoreStats(null)).toEqual(empty);
      expect(calculateRecentScoreStats([{ reason: "Strike" }])).toEqual(empty);
    });
  });

  describe("calculateEventStats", () => {
    it("should calculate stats correctly for mixed events", () => {
      const events = [
        { reason: "Table", numPlayers: 12, score: 80, mmrDelta: 10 },
        { reason: "Table", numPlayers: 12, score: 70, mmrDelta: -5 },
        { reason: "Table", numPlayers: 24, score: 100, mmrDelta: 15 },
        { reason: "Table", numPlayers: 24, score: 90, mmrDelta: 8 },
        { reason: "Penalty", numPlayers: 24, score: 999, mmrDelta: 999 },
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
        { reason: "Table", numPlayers: 12, mmrDelta: 10 },
        { reason: "Table", numPlayers: 12, score: 80, mmrDelta: 5 },
      ];

      const result = calculateEventStats(events);

      expect(result.twelveCount).toBe(2);
      // Current implementation treats missing scores as 0 in the average
      expect(result.avg12).toBe(40);
      expect(result.winRate12).toBe(1); // Both positive deltas
    });

    it("should calculate win rates correctly", () => {
      const events = [
        { reason: "Table", numPlayers: 12, score: 80, mmrDelta: 10 },
        { reason: "Table", numPlayers: 12, score: 60, mmrDelta: -10 },
        { reason: "Table", numPlayers: 12, score: 70, mmrDelta: 0 }, // Zero delta = loss
        { reason: "Table", numPlayers: 12, score: 85, mmrDelta: 5 },
      ];

      const result = calculateEventStats(events);

      expect(result.winRate12).toBe(0.5); // 2 wins out of 4
    });
  });
});
