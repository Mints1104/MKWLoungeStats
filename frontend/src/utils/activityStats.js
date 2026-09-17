/**
 * Helpers for the Lounge stats `activityData.dailyActivity` map, which arrives as
 * `{ "2026-06-22": { Total: 37, CD: 5, SQ: 11, ... } }`, one gapless entry per day
 * of the season. Summing every `Total` reproduces `totalMogis` exactly, so weekly and
 * monthly rollups (and cross-season comparisons) are all derivable client-side.
 *
 * Every date is treated as a plain UTC calendar day. The API sends "YYYY-MM-DD"
 * strings; parsing one with `new Date(str)` yields UTC midnight, so reading it back
 * with local getters shifts the day backwards anywhere west of UTC.
 */

const MS_PER_DAY = 86400000;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const GRANULARITY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const GRANULARITY_VALUES = GRANULARITY_OPTIONS.map((o) => o.value);

/** Parses "YYYY-MM-DD" into a UTC-midnight Date, or null when unparseable. */
export function parseIsoDay(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject impossible dates that Date.UTC silently rolls over (e.g. 2026-02-30).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toIsoDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "2026-06-22" -> "6/22" */
export function formatDayShort(value) {
  const date = parseIsoDay(value);
  if (!date) return value ?? "";
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

/** "2026-06-22" -> "Jun 22, 2026" */
export function formatDayLong(value) {
  const date = parseIsoDay(value);
  if (!date) return value ?? "";
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** "2026-06-22" -> "Jun 22" (year dropped; used for in-season ranges) */
function formatDayNoYear(value) {
  const date = parseIsoDay(value);
  if (!date) return value ?? "";
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/**
 * A day's event count. Prefers the API's own `Total`, falling back to summing the
 * per-tier counts for days where it is missing.
 */
function dayTotal(values) {
  const total = values?.Total;
  if (Number.isFinite(Number(total))) return Number(total);
  if (!values || typeof values !== "object") return 0;
  return Object.values(values).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/** Turns the raw map into a chronologically sorted `{ iso, date, total }[]`. */
export function normalizeDailyActivity(dailyActivity) {
  if (!dailyActivity || typeof dailyActivity !== "object") return [];

  return Object.entries(dailyActivity)
    .map(([iso, values]) => {
      const date = parseIsoDay(iso);
      if (!date) return null;
      return { iso, date, total: dayTotal(values) };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
}

// Monday-anchored: seasons 1, 2 and 3 all start on a Monday, so week boundaries
// line up with season boundaries and only the trailing week can be partial.
function startOfWeek(date) {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - daysSinceMonday * MS_PER_DAY);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function daysInMonth(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

/**
 * Rolls daily activity up into daily / weekly / monthly buckets.
 *
 * A bucket clipped by the start or end of the season reports fewer `days` than
 * `expectedDays` and is flagged `isPartial`, so callers can shade it differently
 * instead of presenting a half-week as a genuine drop in activity. `average` is the
 * per-day rate inside the bucket, which stays comparable across partial buckets.
 *
 * @param {Object} dailyActivity - raw `activityData.dailyActivity` map
 * @param {"daily"|"weekly"|"monthly"} granularity
 * @returns {Array} bucket objects sorted chronologically
 */
export function bucketActivity(dailyActivity, granularity = "daily") {
  const days = normalizeDailyActivity(dailyActivity);
  if (days.length === 0) return [];

  if (granularity !== "weekly" && granularity !== "monthly") {
    return days.map((day) => ({
      key: day.iso,
      label: formatDayShort(day.iso),
      tooltipLabel: formatDayLong(day.iso),
      total: day.total,
      average: day.total,
      days: 1,
      expectedDays: 1,
      isPartial: false,
      start: day.iso,
      end: day.iso,
    }));
  }

  const isWeekly = granularity === "weekly";
  const buckets = new Map();

  days.forEach((day) => {
    const bucketStart = isWeekly ? startOfWeek(day.date) : startOfMonth(day.date);
    const key = toIsoDay(bucketStart);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        label:
          isWeekly ?
            formatDayShort(key)
          : MONTHS_SHORT[bucketStart.getUTCMonth()],
        total: 0,
        days: 0,
        expectedDays: isWeekly ? 7 : daysInMonth(bucketStart),
        start: day.iso,
        end: day.iso,
        monthIndex: bucketStart.getUTCMonth(),
        year: bucketStart.getUTCFullYear(),
      };
      buckets.set(key, bucket);
    }

    bucket.total += day.total;
    bucket.days += 1;
    bucket.end = day.iso;
  });

  return [...buckets.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      tooltipLabel:
        isWeekly ?
          `${formatDayNoYear(bucket.start)} to ${formatDayNoYear(bucket.end)}`
        : `${MONTHS_LONG[bucket.monthIndex]} ${bucket.year}`,
      total: bucket.total,
      average: bucket.days ? bucket.total / bucket.days : 0,
      days: bucket.days,
      expectedDays: bucket.expectedDays,
      isPartial: bucket.days < bucket.expectedDays,
      start: bucket.start,
      end: bucket.end,
    }));
}

/**
 * Totals a season's activity, optionally over only its first `limitDays` days so an
 * in-progress season can be judged at the same point in its life as a finished one.
 */
export function summarizeDailyActivity(dailyActivity, { limitDays } = {}) {
  let days = normalizeDailyActivity(dailyActivity);
  if (Number.isFinite(limitDays) && limitDays > 0) {
    days = days.slice(0, limitDays);
  }

  const total = days.reduce((sum, day) => sum + day.total, 0);

  return {
    days: days.length,
    total,
    perDay: days.length ? total / days.length : null,
    start: days[0]?.iso ?? null,
    end: days[days.length - 1]?.iso ?? null,
  };
}

/**
 * Sums several daily-activity maps into one, used to rebuild a season's combined
 * ladder from its separate 12p and 24p payloads.
 */
export function mergeDailyActivity(maps = []) {
  const merged = {};

  maps.filter(Boolean).forEach((map) => {
    normalizeDailyActivity(map).forEach((day) => {
      merged[day.iso] = { Total: (merged[day.iso]?.Total ?? 0) + day.total };
    });
  });

  return merged;
}

/** Percent change from `previous` to `current`, or null when there is no baseline. */
export function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Builds the season-over-season table.
 *
 * With `basis: "likeForLike"` every season is measured over its first N days, where N
 * is the shortest season in the set. Otherwise an in-progress season is compared on
 * a different number of days than a finished one, and early-season activity (which
 * runs hotter) skews the result. `basis: "fullSeason"` uses each season's own length.
 *
 * @param {Array} entries - `{ season, label, dailyActivity, totalPlayers, averageMmr, isCombinedLadder }`
 * @param {Object} options
 * @param {"likeForLike"|"fullSeason"} options.basis
 * @returns {{ rows: Array, comparedDays: number|null, basis: string }}
 */
export function buildSeasonComparison(entries = [], { basis = "likeForLike" } = {}) {
  const usable = entries
    .filter((entry) => entry && normalizeDailyActivity(entry.dailyActivity).length > 0)
    .map((entry) => ({
      ...entry,
      seasonDays: normalizeDailyActivity(entry.dailyActivity).length,
    }))
    .sort((a, b) => a.season - b.season);

  if (usable.length === 0) {
    return { rows: [], comparedDays: null, basis };
  }

  const comparedDays =
    basis === "likeForLike" ?
      Math.min(...usable.map((entry) => entry.seasonDays))
    : null;

  const rows = usable.map((entry) => {
    const summary = summarizeDailyActivity(entry.dailyActivity, {
      limitDays: comparedDays ?? undefined,
    });

    return {
      season: entry.season,
      label: entry.label,
      isCombinedLadder: Boolean(entry.isCombinedLadder),
      seasonDays: entry.seasonDays,
      seasonStart: entry.dailyActivity ? summary.start : null,
      days: summary.days,
      total: summary.total,
      perDay: summary.perDay,
      totalPlayers: Number.isFinite(entry.totalPlayers) ? entry.totalPlayers : null,
      averageMmr: Number.isFinite(entry.averageMmr) ? entry.averageMmr : null,
    };
  });

  // Deltas are against the immediately preceding season, when we actually have it.
  const withDeltas = rows.map((row, index) => {
    const previous = index > 0 ? rows[index - 1] : null;
    const isAdjacent = previous ? previous.season === row.season - 1 : false;

    return {
      ...row,
      previousLabel: isAdjacent ? previous.label : null,
      perDayChange: isAdjacent ? percentChange(row.perDay, previous.perDay) : null,
      totalChange: isAdjacent ? percentChange(row.total, previous.total) : null,
      playersChange:
        isAdjacent ? percentChange(row.totalPlayers, previous.totalPlayers) : null,
    };
  });

  return { rows: withDeltas, comparedDays, basis };
}

/**
 * Aligns seasons on a shared "week N of the season" axis for the overlay chart.
 *
 * Each point is the season's **mogis per day** inside that block rather than the block
 * total, so blocks stay comparable. A trailing block that does not cover a full week is
 * dropped: it is often a single day, and one quiet closing day reads as a cliff that
 * says nothing about the season's shape. (The comparison table still counts every day;
 * precision belongs there, readability here.) The partial block is kept only when
 * dropping it would leave the chart with nothing to draw, which is the case for a
 * season that is just a few days old.
 *
 * @param {Array} entries - same shape as `buildSeasonComparison`
 * @param {Object} options
 * @param {number} [options.limitDays] - truncate every season to this many days
 * @param {number} [options.blockDays] - days per point (default 7)
 */
export function buildSeasonOverlay(
  entries = [],
  { limitDays, blockDays = 7 } = {},
) {
  const size = Number.isFinite(blockDays) && blockDays > 0 ? blockDays : 7;

  const series = entries
    .filter(Boolean)
    .map((entry) => {
      let days = normalizeDailyActivity(entry.dailyActivity);
      if (Number.isFinite(limitDays) && limitDays > 0) {
        days = days.slice(0, limitDays);
      }

      const blocks = [];
      days.forEach((day, index) => {
        const blockIndex = Math.floor(index / size);
        if (!blocks[blockIndex]) blocks[blockIndex] = { total: 0, days: 0 };
        blocks[blockIndex].total += day.total;
        blocks[blockIndex].days += 1;
      });

      return { key: entry.label, blocks };
    })
    .filter((entry) => entry.blocks.length > 0);

  // Days are contiguous, so only the last block of a season can be short.
  const whole = series.map((entry) => ({
    ...entry,
    blocks: entry.blocks.filter((block) => block.days === size),
  }));
  const usable =
    whole.some((entry) => entry.blocks.length > 0) ? whole : series;

  const blockCount = usable.reduce(
    (max, entry) => Math.max(max, entry.blocks.length),
    0,
  );

  const data = [];
  for (let index = 0; index < blockCount; index += 1) {
    const point = { block: index + 1, label: `W${index + 1}` };

    usable.forEach((entry) => {
      const block = entry.blocks[index];
      if (block && block.days > 0) {
        point[entry.key] = Number((block.total / block.days).toFixed(1));
      }
    });

    data.push(point);
  }

  return data;
}
