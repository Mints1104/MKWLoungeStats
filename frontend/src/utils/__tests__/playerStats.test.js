import { describe, it, expect } from "vitest";
import {
  calculateEventStats,
  calculateRecentScoreStats,
  dedupeMmrChanges,
  getCountedTableEvents,
  getDeletedTableIds,
  getMmrChangeKey,
  isSquadQueueEvent,
} from "../playerStats";

// Shape seen in real season 3 data: a deleted table keeps its Table entry, and a
// later TableDelete with the same changeId refunds the MMR. Newest first, as the
// API sends them. Penalty/bonus IDs come from their own sequences.
const deletedTableHistory = [
  { reason: "TableDelete", changeId: 1148866, mmrDelta: 111, newMmr: 5955 },
  {
    reason: "Table",
    changeId: 1148866,
    mmrDelta: -111,
    newMmr: 5844,
    score: 40,
    numPlayers: 24,
    partnerScores: [10],
  },
  { reason: "Strike", changeId: 1148866, mmrDelta: -100, newMmr: 5955 },
  {
    reason: "Table",
    changeId: 1148800,
    mmrDelta: 50,
    newMmr: 6055,
    score: 90,
    numPlayers: 24,
    partnerScores: [70],
  },
];

describe("playerStats", () => {
  describe("dedupeMmrChanges", () => {
    it("keeps a deleted table's Table and TableDelete entries", () => {
      const result = dedupeMmrChanges(deletedTableHistory);

      expect(result).toHaveLength(4);
      expect(result.map((e) => e.reason)).toEqual([
        "TableDelete",
        "Table",
        "Strike",
        "Table",
      ]);
    });

    it("drops an entry repeated with the same reason and changeId", () => {
      const event = { reason: "Table", changeId: 1, newMmr: 100 };

      expect(dedupeMmrChanges([event, { ...event }])).toHaveLength(1);
    });

    it("falls back to time/newMmr/reason when there is no changeId", () => {
      const placement = { reason: "Placement", time: "t1", newMmr: 5000 };

      expect(dedupeMmrChanges([placement, { ...placement }])).toHaveLength(1);
      expect(getMmrChangeKey(placement)).toBe("t1-5000-Placement");
    });

    it("returns an empty array for missing input", () => {
      expect(dedupeMmrChanges(undefined)).toEqual([]);
    });
  });

  describe("deleted tables", () => {
    it("collects the IDs of deleted tables", () => {
      expect([...getDeletedTableIds(deletedTableHistory)]).toEqual([1148866]);
    });

    it("leaves deleted tables and non-table events out of counted events", () => {
      expect(
        getCountedTableEvents(deletedTableHistory).map((e) => e.changeId),
      ).toEqual([1148800]);
    });

    it("excludes deleted tables from event stats, as the API does", () => {
      const stats = calculateEventStats(deletedTableHistory);

      expect(stats.twentyFourCount).toBe(1);
      expect(stats.avg24).toBe(90);
      expect(stats.winRate24).toBe(1);
    });

    it("uses the season's deleted IDs for a slice that lacks the TableDelete", () => {
      const slice = deletedTableHistory.slice(1); // TableDelete not displayed
      const deletedIds = getDeletedTableIds(deletedTableHistory);

      expect(calculateRecentScoreStats(slice, deletedIds).avgScore).toBe(90);
      expect(calculateRecentScoreStats(slice, deletedIds).partnerAvgScore).toBe(
        70,
      );
      // Without the season's IDs the slice can't know the table was deleted
      expect(calculateRecentScoreStats(slice).avgScore).toBe(65);
    });
  });

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
      // Events without a score are left out of the average, not counted as 0
      expect(result.avg12).toBe(80);
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
