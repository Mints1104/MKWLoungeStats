import { getCountedTableEvents, getDeletedTableIds } from "./playerStats";

/**
 * Calculates score distribution data for a bar chart
 * @param {Array} events - Array of event objects with score and numPlayers properties
 * @param {string} filter - Filter for player count: "all", "12", or "24"
 * @returns {Array} Array of score range objects with counts
 */
export function calculateScoreDistribution(events, filter = "all") {
  if (!events || !Array.isArray(events)) return [];

  // Only include table events (exclude penalties and deleted tables)
  const tableEvents = getCountedTableEvents(events);

  let filteredEvents = tableEvents;
  if (filter === "12") {
    filteredEvents = tableEvents.filter((e) => e.numPlayers === 12);
  } else if (filter === "24") {
    filteredEvents = tableEvents.filter((e) => e.numPlayers === 24);
  }

  const ranges = [
    { range: "0-40", min: 0, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
    { range: "101-120", min: 101, max: 120, count: 0 },
    { range: "121+", min: 121, max: Infinity, count: 0 },
  ];

  filteredEvents.forEach((event) => {
    const score = event.score;
    const range = ranges.find((r) => score >= r.min && score <= r.max);
    if (range) range.count++;
  });

  return ranges;
}

/**
 * Horizontal gradient stops that switch colour sharply where the rank changes.
 * The gradient spans the drawn line's bounding box, so pass exactly the points
 * being drawn (e.g. the range picked with the chart's brush).
 * @param {Array} points - `{ rankColor }` points, oldest first
 * @param {string} [xKey] - Numeric x field (e.g. "time") for a value-scaled axis;
 *   omit for an evenly spaced category axis
 * @returns {Array} `{ offset, color }[]`
 */
export function calculateGradientStops(points, xKey) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const first = xKey ? points[0][xKey] : 0;
  const span = xKey ? points[points.length - 1][xKey] - first : points.length - 1;
  const positionOf = (point, index) => {
    if (span <= 0) return 0;
    return (((xKey ? point[xKey] : index) - first) / span) * 100;
  };

  const stops = [];
  let lastColor = points[0].rankColor;

  points.forEach((point, index) => {
    const position = positionOf(point, index);

    // Create sharp color transitions between rank changes
    if (point.rankColor !== lastColor && index > 0) {
      // Add transition: previous color just before change
      stops.push({
        offset: `${Math.max(0, position - 0.1)}%`,
        color: lastColor,
      });
      // New color starts immediately
      stops.push({
        offset: `${position}%`,
        color: point.rankColor,
      });
      lastColor = point.rankColor;
    } else if (index === 0) {
      stops.push({
        offset: "0%",
        color: point.rankColor,
      });
    } else if (index === points.length - 1) {
      stops.push({
        offset: "100%",
        color: point.rankColor,
      });
    }
  });

  return stops;
}

/**
 * Calculates MMR history data for line chart with rank color information. Each
 * point also carries what the tooltip and markers need: date, reason, score,
 * placement, tier, format and whether the table was later deleted.
 * @param {Array} mmrChanges - Array of MMR change events (newest first)
 * @param {Function} getRankForMmrValue - Function to get rank info from MMR value
 * @returns {Object} Object with mmrHistoryData, gradientStops, and gradientId
 */
export function calculateMmrHistoryData(
  mmrChanges,
  getRankForMmrValue,
  playerId = "default",
) {
  if (!mmrChanges || !Array.isArray(mmrChanges) || mmrChanges.length === 0) {
    return {
      mmrHistoryData: [],
      gradientStops: [],
      gradientId: `mmrGradient-${playerId}`,
    };
  }

  const deletedTableIds = getDeletedTableIds(mmrChanges);

  const history = mmrChanges
    .slice()
    .reverse()
    .map((event, index) => {
      const mmr = event?.newMmr ?? event?.mmr ?? null;
      if (mmr == null) return null;
      const rankInfo = getRankForMmrValue(mmr);
      const time = Date.parse(event.time);
      return {
        event: index + 1,
        time: Number.isNaN(time) ? null : time,
        mmr,
        rankColor: rankInfo.color,
        reason: event.reason,
        mmrDelta: event.mmrDelta ?? null,
        score: event.score ?? null,
        placement: event.rank ?? null,
        tier: event.tier ?? null,
        numPlayers: event.numPlayers ?? null,
        numTeams: event.numTeams ?? null,
        tableDeleted:
          event.reason === "Table" && deletedTableIds.has(event.changeId),
      };
    })
    .filter(Boolean);

  return {
    mmrHistoryData: history,
    gradientStops: calculateGradientStops(history),
    gradientId: `mmrGradient-${playerId}`,
  };
}

/**
 * The highest point of an MMR history (the latest one on a tie).
 * @param {Array} points - calculateMmrHistoryData points
 * @returns {Object|null}
 */
export function findPeakPoint(points) {
  if (!Array.isArray(points)) return null;
  return points.reduce(
    (peak, point) => (!peak || point.mmr >= peak.mmr ? point : peak),
    null,
  );
}

/**
 * Rank thresholds worth drawing as reference lines: those whose floor falls
 * inside the plotted MMR range (the bottom rank's 0 floor never does).
 * @param {Array} thresholds - `{ name, min }[]`
 * @param {Array} points - plotted `{ mmr }` points
 * @returns {Array} `{ name, min }[]`
 */
export function getVisibleRankLines(thresholds, points) {
  if (!Array.isArray(thresholds) || !Array.isArray(points) || !points.length) {
    return [];
  }
  const mmrs = points.map((point) => point.mmr);
  const low = Math.min(...mmrs);
  const high = Math.max(...mmrs);
  return thresholds.filter((rank) => rank.min > low && rank.min <= high);
}

/**
 * Data key for the player at `index` in calculateComparisonMmrData. Keyed by position
 * rather than name: Recharts reads a dotted dataKey like "J.R." as a nested path.
 * @param {number} index - Player's index in playersData
 * @returns {string} Data key for that player's series
 */
export const comparisonSeriesKey = (index) => `player${index}`;

/**
 * Prepares MMR history data for comparing multiple players on an overlaid line chart
 * @param {Array} playersData - Array of player objects with mmrChanges
 * @returns {Array} Array of data points with event numbers and one MMR value per
 *   player, keyed by comparisonSeriesKey(index)
 */
export function calculateComparisonMmrData(playersData) {
  if (!playersData || playersData.length === 0) return [];

  // Oldest event first
  const histories = playersData.map(
    (player) => player.mmrChanges?.slice().reverse() || [],
  );
  const maxEvents = Math.max(...histories.map((events) => events.length));
  const data = [];

  for (let i = 0; i < maxEvents; i++) {
    const point = { event: i + 1 };
    histories.forEach((events, index) => {
      if (events[i]) {
        point[comparisonSeriesKey(index)] = events[i].newMmr;
      }
    });
    data.push(point);
  }

  return data;
}

/** Y-axis domain for MMR charts; floor is clamped to 0 since MMR cannot go negative */
export const MMR_CHART_Y_DOMAIN = [
  (min) => Math.max(0, min - 50),
  (max) => max + 50,
];
