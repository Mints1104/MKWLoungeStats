// Squad Queue events are marked by the upstream API with tier "SQ" (not by the
// presence of partners: non-SQ team events exist too, e.g. tier "S" with numTeams 12).
export const isSquadQueueEvent = (event) =>
  typeof event?.tier === "string" && event.tier.trim().toUpperCase() === "SQ";

const isNumericScore = (score) =>
  typeof score === "number" && !Number.isNaN(score);

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
// "recent events"). Penalties and other non-table events are excluded.
// The noSq* variants use the same formulas the Lounge API uses for
// noSQAverageScore / noSQPartnerAverage.
export const calculateRecentScoreStats = (events = []) => {
  const empty = {
    avgScore: null,
    bestScore: null,
    partnerAvgScore: null,
    noSqAvgScore: null,
    noSqPartnerAvgScore: null,
  };

  if (!Array.isArray(events) || events.length === 0) return empty;

  const tableEvents = events.filter((event) => event.reason === "Table");
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

  // Exclude penalties
  const tableEvents = mmrChanges.filter((event) => event.reason === "Table");

  const twelves = tableEvents.filter((event) => event.numPlayers === 12);
  const twentyFours = tableEvents.filter((event) => event.numPlayers === 24);

  const twelveCount = twelves.length;
  const twentyFourCount = twentyFours.length;

  const avg12 =
    twelveCount ?
      twelves.reduce((acc, event) => acc + (event.score ?? 0), 0) / twelveCount
    : null;

  const avg24 =
    twentyFourCount ?
      twentyFours.reduce((acc, event) => acc + (event.score ?? 0), 0) /
      twentyFourCount
    : null;

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
