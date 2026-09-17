import { describe, it, expect } from "vitest";
import {
  bucketActivity,
  buildSeasonComparison,
  buildSeasonOverlay,
  formatDayShort,
  mergeDailyActivity,
  normalizeDailyActivity,
  parseIsoDay,
  percentChange,
  summarizeDailyActivity,
} from "../activityStats";

/** Builds a gapless `{ "YYYY-MM-DD": { Total } }` map, like the API returns. */
function makeDays(startIso, totals) {
  const start = parseIsoDay(startIso);
  const map = {};
  totals.forEach((total, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    map[date.toISOString().slice(0, 10)] = { Total: total };
  });
  return map;
}

describe("activityStats", () => {
  describe("parseIsoDay", () => {
    it("parses a date as a UTC calendar day", () => {
      const date = parseIsoDay("2026-06-22");
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(5);
      expect(date.getUTCDate()).toBe(22);
    });

    it("rejects malformed and impossible dates", () => {
      expect(parseIsoDay("not-a-date")).toBeNull();
      expect(parseIsoDay("2026-02-30")).toBeNull();
      expect(parseIsoDay(null)).toBeNull();
      expect(parseIsoDay(20260622)).toBeNull();
    });

    it("keeps the calendar day stable regardless of the local timezone", () => {
      // `new Date("2026-06-22").getDate()` returns 21 west of UTC; the UTC getters
      // used here must not drift.
      expect(formatDayShort("2026-06-22")).toBe("6/22");
      expect(formatDayShort("2026-01-01")).toBe("1/1");
    });
  });

  describe("normalizeDailyActivity", () => {
    it("sorts chronologically and prefers the API's Total", () => {
      const result = normalizeDailyActivity({
        "2026-06-24": { Total: 10, A: 4, B: 6 },
        "2026-06-22": { Total: 37, CD: 5, SQ: 11 },
      });

      expect(result.map((d) => d.iso)).toEqual(["2026-06-22", "2026-06-24"]);
      expect(result[0].total).toBe(37);
      expect(result[1].total).toBe(10);
    });

    it("falls back to summing tier counts when Total is missing", () => {
      const result = normalizeDailyActivity({ "2026-06-22": { A: 4, B: 6 } });
      expect(result[0].total).toBe(10);
    });

    it("returns an empty array for junk input", () => {
      expect(normalizeDailyActivity(null)).toEqual([]);
      expect(normalizeDailyActivity(undefined)).toEqual([]);
      expect(normalizeDailyActivity({ nonsense: { Total: 5 } })).toEqual([]);
    });
  });

  describe("bucketActivity", () => {
    it("returns one bucket per day at daily granularity", () => {
      const buckets = bucketActivity(makeDays("2026-06-22", [1, 2, 3]), "daily");

      expect(buckets).toHaveLength(3);
      expect(buckets[0]).toMatchObject({
        label: "6/22",
        total: 1,
        days: 1,
        isPartial: false,
      });
    });

    it("groups weeks from Monday and flags the trailing part-week", () => {
      // 2026-06-22 is a Monday: 7 full days, then 2 days of the next week.
      const buckets = bucketActivity(
        makeDays("2026-06-22", [1, 1, 1, 1, 1, 1, 1, 5, 5]),
        "weekly",
      );

      expect(buckets).toHaveLength(2);
      expect(buckets[0]).toMatchObject({
        key: "2026-06-22",
        total: 7,
        days: 7,
        expectedDays: 7,
        isPartial: false,
        average: 1,
      });
      expect(buckets[1]).toMatchObject({
        key: "2026-06-29",
        total: 10,
        days: 2,
        isPartial: true,
        average: 5,
      });
      expect(buckets[1].tooltipLabel).toBe("Jun 29 to Jun 30");
    });

    it("puts a mid-week start into the week that contains it", () => {
      // 2026-06-25 is a Thursday; its week still starts Monday 2026-06-22.
      const buckets = bucketActivity(makeDays("2026-06-25", [2, 2, 2]), "weekly");

      expect(buckets).toHaveLength(1);
      expect(buckets[0]).toMatchObject({
        key: "2026-06-22",
        days: 3,
        total: 6,
        isPartial: true,
      });
    });

    it("groups calendar months and uses the real month length", () => {
      // 9 days from Jun 22 (partial June) plus 3 days of July.
      const buckets = bucketActivity(
        makeDays("2026-06-22", [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2]),
        "monthly",
      );

      expect(buckets).toHaveLength(2);
      expect(buckets[0]).toMatchObject({
        label: "Jun",
        tooltipLabel: "June 2026",
        total: 9,
        days: 9,
        expectedDays: 30,
        isPartial: true,
      });
      expect(buckets[1]).toMatchObject({
        label: "Jul",
        total: 6,
        days: 3,
        expectedDays: 31,
        isPartial: true,
      });
    });

    it("preserves the grand total no matter the granularity", () => {
      const totals = Array.from({ length: 88 }, (_, i) => (i % 17) + 1);
      const days = makeDays("2026-06-22", totals);
      const expected = totals.reduce((sum, value) => sum + value, 0);

      ["daily", "weekly", "monthly"].forEach((granularity) => {
        const sum = bucketActivity(days, granularity).reduce(
          (acc, bucket) => acc + bucket.total,
          0,
        );
        expect(sum).toBe(expected);
      });
    });

    it("treats an unknown granularity as daily", () => {
      const buckets = bucketActivity(makeDays("2026-06-22", [1, 2]), "yearly");
      expect(buckets).toHaveLength(2);
    });

    it("returns an empty array when there is no activity", () => {
      expect(bucketActivity({}, "weekly")).toEqual([]);
      expect(bucketActivity(null, "monthly")).toEqual([]);
    });
  });

  describe("summarizeDailyActivity", () => {
    it("computes totals and the per-day rate", () => {
      const summary = summarizeDailyActivity(makeDays("2026-06-22", [10, 20, 30]));

      expect(summary).toMatchObject({
        days: 3,
        total: 60,
        perDay: 20,
        start: "2026-06-22",
        end: "2026-06-24",
      });
    });

    it("truncates to the first N days when asked", () => {
      const summary = summarizeDailyActivity(
        makeDays("2026-06-22", [10, 20, 30, 100]),
        { limitDays: 2 },
      );

      expect(summary).toMatchObject({ days: 2, total: 30, perDay: 15 });
    });

    it("reports a null rate with no data", () => {
      expect(summarizeDailyActivity({})).toMatchObject({
        days: 0,
        total: 0,
        perDay: null,
      });
    });
  });

  describe("mergeDailyActivity", () => {
    it("sums matching days across ladders and keeps unmatched ones", () => {
      const merged = mergeDailyActivity([
        { "2026-06-22": { Total: 10 }, "2026-06-23": { Total: 5 } },
        { "2026-06-22": { Total: 4 }, "2026-06-24": { Total: 7 } },
      ]);

      expect(merged).toEqual({
        "2026-06-22": { Total: 14 },
        "2026-06-23": { Total: 5 },
        "2026-06-24": { Total: 7 },
      });
    });

    it("ignores null entries", () => {
      expect(mergeDailyActivity([null, { "2026-06-22": { Total: 3 } }])).toEqual({
        "2026-06-22": { Total: 3 },
      });
      expect(mergeDailyActivity([])).toEqual({});
    });
  });

  describe("percentChange", () => {
    it("computes signed change", () => {
      expect(percentChange(150, 100)).toBe(50);
      expect(percentChange(50, 100)).toBe(-50);
      expect(percentChange(100, 100)).toBe(0);
    });

    it("returns null without a usable baseline", () => {
      expect(percentChange(100, 0)).toBeNull();
      expect(percentChange(100, null)).toBeNull();
      expect(percentChange(null, 100)).toBeNull();
    });
  });

  describe("buildSeasonComparison", () => {
    const entries = [
      {
        season: 2,
        label: "Season 2",
        dailyActivity: makeDays("2026-02-02", Array(10).fill(20)),
        totalPlayers: 7264,
        averageMmr: 5000,
      },
      {
        season: 3,
        label: "Season 3",
        dailyActivity: makeDays("2026-06-22", Array(5).fill(10)),
        totalPlayers: 5460,
        averageMmr: 5100,
      },
    ];

    it("measures every season over the shortest season's length by default", () => {
      const { rows, comparedDays } = buildSeasonComparison(entries);

      expect(comparedDays).toBe(5);
      expect(rows[0]).toMatchObject({
        season: 2,
        days: 5,
        seasonDays: 10,
        total: 100,
        perDay: 20,
      });
      expect(rows[1]).toMatchObject({ season: 3, days: 5, total: 50, perDay: 10 });
      expect(rows[1].perDayChange).toBe(-50);
    });

    it("uses each season's own length on the full-season basis", () => {
      const { rows, comparedDays } = buildSeasonComparison(entries, {
        basis: "fullSeason",
      });

      expect(comparedDays).toBeNull();
      expect(rows[0]).toMatchObject({ days: 10, total: 200, perDay: 20 });
      expect(rows[1]).toMatchObject({ days: 5, total: 50, perDay: 10 });
      expect(rows[1].perDayChange).toBe(-50);
    });

    it("sorts by season and leaves the first row without a delta", () => {
      const { rows } = buildSeasonComparison([entries[1], entries[0]]);

      expect(rows.map((row) => row.season)).toEqual([2, 3]);
      expect(rows[0].perDayChange).toBeNull();
      expect(rows[0].previousLabel).toBeNull();
      expect(rows[1].previousLabel).toBe("Season 2");
    });

    it("does not compare across a gap in seasons", () => {
      const { rows } = buildSeasonComparison([
        entries[0],
        { ...entries[1], season: 5, label: "Season 5" },
      ]);

      expect(rows[1].perDayChange).toBeNull();
      expect(rows[1].previousLabel).toBeNull();
    });

    it("drops seasons with no activity data", () => {
      const { rows } = buildSeasonComparison([
        ...entries,
        { season: 4, label: "Season 4", dailyActivity: null },
      ]);

      expect(rows.map((row) => row.season)).toEqual([2, 3]);
    });

    it("handles an empty input", () => {
      expect(buildSeasonComparison([])).toMatchObject({
        rows: [],
        comparedDays: null,
      });
    });
  });

  describe("buildSeasonOverlay", () => {
    it("aligns seasons on week-of-season and reports a per-day rate", () => {
      const data = buildSeasonOverlay([
        {
          season: 2,
          label: "Season 2",
          dailyActivity: makeDays("2026-02-02", Array(14).fill(20)),
        },
        {
          season: 3,
          label: "Season 3",
          // Different calendar start, but should still land on weeks 1 and 2.
          dailyActivity: makeDays("2026-06-22", Array(14).fill(10)),
        },
      ]);

      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        block: 1,
        label: "W1",
        "Season 2": 20,
        "Season 3": 10,
      });
      expect(data[1]).toMatchObject({ block: 2, label: "W2" });
    });

    it("drops a trailing part-week so one quiet closing day is not a cliff", () => {
      const data = buildSeasonOverlay([
        {
          season: 3,
          label: "Season 3",
          // 7 normal days, then a lone 8th day with almost no activity.
          dailyActivity: makeDays("2026-06-22", [...Array(7).fill(200), 23]),
        },
      ]);

      expect(data).toHaveLength(1);
      expect(data[0]["Season 3"]).toBe(200);
    });

    it("keeps a part-week when dropping it would empty the chart", () => {
      // A season only three days old still has to appear.
      const data = buildSeasonOverlay([
        {
          season: 3,
          label: "Season 3",
          dailyActivity: makeDays("2026-06-22", [10, 20, 30]),
        },
      ]);

      expect(data).toHaveLength(1);
      expect(data[0]["Season 3"]).toBe(20);
    });

    it("truncates every season to limitDays", () => {
      const data = buildSeasonOverlay(
        [
          {
            season: 2,
            label: "Season 2",
            dailyActivity: makeDays("2026-02-02", Array(21).fill(20)),
          },
        ],
        { limitDays: 7 },
      );

      expect(data).toHaveLength(1);
    });

    it("leaves a season out of a week it has no days for", () => {
      const data = buildSeasonOverlay([
        {
          season: 2,
          label: "Season 2",
          dailyActivity: makeDays("2026-02-02", Array(14).fill(20)),
        },
        {
          season: 3,
          label: "Season 3",
          dailyActivity: makeDays("2026-06-22", Array(7).fill(10)),
        },
      ]);

      expect(data[1]["Season 2"]).toBe(20);
      expect(data[1]["Season 3"]).toBeUndefined();
    });

    it("handles an empty input", () => {
      expect(buildSeasonOverlay([])).toEqual([]);
    });
  });
});
