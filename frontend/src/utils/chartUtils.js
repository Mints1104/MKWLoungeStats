/**
 * Calculates score distribution data for a bar chart
 * @param {Array} events - Array of event objects with score and numPlayers properties
 * @param {string} filter - Filter for player count: "all", "12", or "24"
 * @returns {Array} Array of score range objects with counts
 */
export function calculateScoreDistribution(events, filter = "all") {
  if (!events || !Array.isArray(events)) return [];

  let filteredEvents = events;
  if (filter === "12") {
    filteredEvents = events.filter((e) => e.numPlayers === 12);
  } else if (filter === "24") {
    filteredEvents = events.filter((e) => e.numPlayers === 24);
  }

  const ranges = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
    { range: "101-120", min: 101, max: 120, count: 0 },
  ];

  filteredEvents.forEach((event) => {
    const score = event.score;
    const range = ranges.find((r) => score >= r.min && score <= r.max);
    if (range) range.count++;
  });

  return ranges;
}

/**
 * Calculates MMR history data for line chart with rank color information
 * @param {Array} mmrChanges - Array of MMR change events
 * @param {Function} getRankForMmrValue - Function to get rank info from MMR value
 * @returns {Object} Object with mmrHistoryData, gradientStops, and gradientId
 */
export function calculateMmrHistoryData(
  mmrChanges,
  getRankForMmrValue,
  playerId = "default"
) {
  if (!mmrChanges || !Array.isArray(mmrChanges) || mmrChanges.length === 0) {
    return {
      mmrHistoryData: [],
      gradientStops: [],
      gradientId: `mmrGradient-${playerId}`,
    };
  }

  const history = mmrChanges
    .slice()
    .reverse()
    .map((event, index) => {
      const mmr = event?.newMmr ?? event?.mmr ?? null;
      if (mmr == null) return null;
      const rankInfo = getRankForMmrValue(mmr);
      return { event: index + 1, mmr, rankColor: rankInfo.color };
    })
    .filter(Boolean);

  if (history.length === 0) {
    return {
      mmrHistoryData: [],
      gradientStops: [],
      gradientId: `mmrGradient-${playerId}`,
    };
  }

  // Build gradient stops based on rank color changes
  const stops = [];
  let lastColor = history[0].rankColor;

  history.forEach((point, index) => {
    const position =
      history.length > 1 ? (index / (history.length - 1)) * 100 : 0;

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
    } else if (index === history.length - 1) {
      stops.push({
        offset: "100%",
        color: point.rankColor,
      });
    }
  });

  return {
    mmrHistoryData: history,
    gradientStops: stops,
    gradientId: `mmrGradient-${playerId}`,
  };
}

/**
 * Prepares MMR history data for comparing multiple players on an overlaid line chart
 * @param {Array} playersData - Array of player objects with mmrChanges
 * @returns {Array} Array of data points for the chart with event numbers and player MMR values
 */
export function calculateComparisonMmrData(playersData) {
  if (!playersData || playersData.length === 0) return [];

  const maxEvents = Math.max(
    ...playersData.map((p) => p.mmrChanges?.length || 0)
  );
  const data = [];

  for (let i = 0; i < maxEvents; i++) {
    const point = { event: i + 1 };
    playersData.forEach((player) => {
      const events = player.mmrChanges?.slice().reverse() || [];
      if (events[i]) {
        point[player.name] = events[i].newMmr;
      }
    });
    data.push(point);
  }

  return data;
}
