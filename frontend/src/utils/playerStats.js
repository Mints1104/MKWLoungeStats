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

  // Only include table events (exclude penalties)
  const tableEvents = mmrChanges.filter((event) => event.reason === "Table");
  
  const twelves = tableEvents.filter((event) => event.numPlayers === 12);
  const twentyFours = tableEvents.filter((event) => event.numPlayers === 24);

  const twelveCount = twelves.length;
  const twentyFourCount = twentyFours.length;

  const avg12 = twelveCount
    ? twelves.reduce((acc, event) => acc + (event.score ?? 0), 0) / twelveCount
    : null;

  const avg24 = twentyFourCount
    ? twentyFours.reduce((acc, event) => acc + (event.score ?? 0), 0) /
      twentyFourCount
    : null;

  const winRate12 = twelveCount
    ? twelves.filter((event) => (event.mmrDelta ?? 0) > 0).length / twelveCount
    : null;

  const winRate24 = twentyFourCount
    ? twentyFours.filter((event) => (event.mmrDelta ?? 0) > 0).length /
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
