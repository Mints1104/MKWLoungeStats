/**
 * Profile URL for a player on a given season and ladder.
 * @param {string} name - Player name
 * @param {number} season - Season number
 * @param {number} mmrType - MMR type (12 or 24); left out before season 2
 * @returns {string} e.g. "/player/Guti?season=3&mmrType=24"
 */
export function getProfilePath(name, season, mmrType) {
  const params = new URLSearchParams({ season: String(season) });
  if (Number(season) >= 2 && mmrType != null) {
    params.set("mmrType", String(mmrType));
  }
  return `/player/${encodeURIComponent(name)}?${params}`;
}

/**
 * Compare-page query for a set of players on a given season and ladder.
 * @param {string[]} names - Player names, in display order
 * @param {number} season - Season number
 * @param {number} mmrType - MMR type (12 or 24); left out before season 2
 * @returns {URLSearchParams}
 */
export function getCompareParams(names, season, mmrType) {
  const params = new URLSearchParams({
    names: names.map((name) => name.trim()).filter(Boolean).join(","),
    season: String(season),
  });
  if (Number(season) >= 2 && mmrType != null) {
    params.set("mmrType", String(mmrType));
  }
  return params;
}

/**
 * Compare-page URL; see getCompareParams.
 * @returns {string} e.g. "/compare?names=Amy%2CZed&season=3&mmrType=24"
 */
export function getComparePath(names, season, mmrType) {
  return `/compare?${getCompareParams(names, season, mmrType)}`;
}

/** Splits a compare URL's `names` param into at most `max` trimmed names. */
export function parseCompareNames(value, max = 4) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, max);
}
