/**
 * True when a saved scroll key (pathname plus normalised query) belongs to `pathname`:
 * the path itself or the path with a query string, so "/player/Bob" never matches
 * "/player/Bobby".
 * @param {string} key - Saved scroll key, e.g. "/leaderboard?page=2"
 * @param {string} pathname - Current pathname, e.g. "/leaderboard"
 * @returns {boolean}
 */
export function isScrollKeyOnPath(key, pathname) {
  return key === pathname || key.startsWith(`${pathname}?`);
}
