export const CURRENT_SEASON = 3;

/** "Preseason" for season 0, otherwise "Season N". */
export function getSeasonLabel(season) {
  return Number(season) === 0 ? "Preseason" : `Season ${season}`;
}

/** Every season from CURRENT_SEASON down to the preseason, for season pickers. */
export const SEASON_OPTIONS = Array.from(
  { length: CURRENT_SEASON + 1 },
  (_, index) => CURRENT_SEASON - index,
).map((season) => ({ value: season, label: getSeasonLabel(season) }));
