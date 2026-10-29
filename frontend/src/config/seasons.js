export const CURRENT_SEASON = 3;

/** "Preseason" for season 0, otherwise "Season N". */
export function getSeasonLabel(season) {
  return Number(season) === 0 ? "Preseason" : `Season ${season}`;
}

// Seasons 0 and 1 ran as a single "mkworld" ladder; 12p and 24p split from season 2
export const FIRST_SPLIT_SEASON = 2;

/**
 * Every ladder a player could have played, newest first: one per pre-split season,
 * then 24p and 12p for each split season.
 * @returns {Array<{ season: number, mmrType: number|null }>}
 */
export function getAllLadders() {
  const ladders = [];
  for (let season = CURRENT_SEASON; season >= 0; season -= 1) {
    if (season >= FIRST_SPLIT_SEASON) {
      ladders.push({ season, mmrType: 24 }, { season, mmrType: 12 });
    } else {
      ladders.push({ season, mmrType: null });
    }
  }
  return ladders;
}

/** Every season from CURRENT_SEASON down to the preseason, for season pickers. */
export const SEASON_OPTIONS = Array.from(
  { length: CURRENT_SEASON + 1 },
  (_, index) => CURRENT_SEASON - index,
).map((season) => ({ value: season, label: getSeasonLabel(season) }));
