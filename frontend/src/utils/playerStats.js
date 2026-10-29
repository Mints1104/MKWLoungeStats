// Squad Queue events are marked by the upstream API with tier "SQ" (not by the
// presence of partners: non-SQ team events exist too, e.g. tier "S" with numTeams 12).
export const isSquadQueueEvent = (event) =>
  typeof event?.tier === "string" && event.tier.trim().toUpperCase() === "SQ";

const isNumericScore = (score) =>
  typeof score === "number" && !Number.isNaN(score);

/**
 * Unique key for an mmrChanges entry (also used for React list keys). changeId is
 * only unique within a reason: a TableDelete reuses its table's ID, and penalties
 * and bonuses number from their own sequences.
 */
export const getMmrChangeKey = (event) =>
  event.changeId != null ?
    `${event.reason}-${event.changeId}`
  : `${event.time}-${event.newMmr}-${event.reason}`;

/**
 * Removes repeated mmrChanges entries (same reason and changeId), keeping the first
 * and preserving order. A deleted table keeps both its Table and TableDelete entries.
 */
export const dedupeMmrChanges = (mmrChanges = []) => {
  if (!Array.isArray(mmrChanges)) return [];

  const unique = new Map();
  mmrChanges.forEach((event) => {
    const key = getMmrChangeKey(event);
    if (!unique.has(key)) {
      unique.set(key, { ...event });
    }
  });
  return Array.from(unique.values());
};

/**
 * IDs of tables that were later deleted. Their Table events stay in mmrChanges
 * (with a matching TableDelete refunding the MMR), but the Lounge API leaves them
 * out of eventsPlayed, averageScore, winRate and the other aggregates.
 */
export const getDeletedTableIds = (events = []) =>
  new Set(
    (Array.isArray(events) ? events : [])
      .filter((event) => event.reason === "TableDelete" && event.changeId != null)
      .map((event) => event.changeId),
  );

/**
 * Table events that count toward stats: penalties, bonuses and other non-table
 * entries are excluded, and so are tables that were later deleted.
 * @param {Array} events - mmrChanges entries
 * @param {Set} [deletedTableIds] - from getDeletedTableIds; pass the full season's
 *   set when `events` is only a slice of it
 */
export const getCountedTableEvents = (
  events = [],
  deletedTableIds = getDeletedTableIds(events),
) =>
  (Array.isArray(events) ? events : []).filter(
    (event) =>
      event.reason === "Table" && !deletedTableIds.has(event.changeId),
  );

const averageScoreOf = (events) => {
  const withScores = events.filter((event) => isNumericScore(event.score));
  if (!withScores.length) return null;
  return (
    withScores.reduce((acc, event) => acc + event.score, 0) / withScores.length
  );
};

const averagePartnerScoreOf = (events) => {
  // Flattened across events: a 3v3 contributes 2 scores, an FFA contributes none.
  const partnerScores = events
    .flatMap((event) =>
      Array.isArray(event.partnerScores) ? event.partnerScores : [],
    )
    .filter(isNumericScore);
  if (!partnerScores.length) return null;
  return (
    partnerScores.reduce((acc, score) => acc + score, 0) / partnerScores.length
  );
};

// Score stats for an arbitrary slice of events (e.g. the currently displayed
// "recent events"). Penalties, other non-table events and deleted tables are
// excluded. The noSq* variants use the same formulas the Lounge API uses for
// noSQAverageScore / noSQPartnerAverage.
export const calculateRecentScoreStats = (events = [], deletedTableIds) => {
  const empty = {
    avgScore: null,
    bestScore: null,
    partnerAvgScore: null,
    noSqAvgScore: null,
    noSqPartnerAvgScore: null,
  };

  if (!Array.isArray(events) || events.length === 0) return empty;

  const tableEvents = getCountedTableEvents(
    events,
    deletedTableIds ?? getDeletedTableIds(events),
  );
  if (!tableEvents.length) return empty;

  const noSqTableEvents = tableEvents.filter(
    (event) => !isSquadQueueEvent(event),
  );

  const withScores = tableEvents.filter((event) => isNumericScore(event.score));

  return {
    avgScore: averageScoreOf(tableEvents),
    bestScore:
      withScores.length ?
        withScores.reduce(
          (max, event) => (event.score > max ? event.score : max),
          withScores[0].score,
        )
      : null,
    partnerAvgScore: averagePartnerScoreOf(tableEvents),
    noSqAvgScore: averageScoreOf(noSqTableEvents),
    noSqPartnerAvgScore: averagePartnerScoreOf(noSqTableEvents),
  };
};

export const calculateEventStats = (mmrChanges = []) => {
  if (!Array.isArray(mmrChanges) || mmrChanges.length === 0) {
    return {
      twelveCount: 0,
      twentyFourCount: 0,
      avg12: null,
      avg24: null,
      winRate12: null,
      winRate24: null,
    };
  }

  // Exclude penalties and deleted tables
  const tableEvents = getCountedTableEvents(mmrChanges);

  const twelves = tableEvents.filter((event) => event.numPlayers === 12);
  const twentyFours = tableEvents.filter((event) => event.numPlayers === 24);

  const twelveCount = twelves.length;
  const twentyFourCount = twentyFours.length;

  // Events without a numeric score are left out rather than counted as 0
  const avg12 = averageScoreOf(twelves);
  const avg24 = averageScoreOf(twentyFours);

  const winRate12 =
    twelveCount ?
      twelves.filter((event) => (event.mmrDelta ?? 0) > 0).length / twelveCount
    : null;

  const winRate24 =
    twentyFourCount ?
      twentyFours.filter((event) => (event.mmrDelta ?? 0) > 0).length /
      twentyFourCount
    : null;

  return {
    twelveCount,
    twentyFourCount,
    avg12,
    avg24,
    winRate12,
    winRate24,
  };
};
