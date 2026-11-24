import logger from "./logger";

export const RECENT_SEARCHES_KEY = "recentPlayerSearches";
const MAX_RECENT_SEARCHES = 3;

/** Recently viewed player names, newest first. */
export function loadRecentSearches() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    return Array.isArray(saved) ?
        saved.filter((name) => typeof name === "string").slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch (e) {
    logger.warn("Failed to load recent searches", e);
    return [];
  }
}

/** Moves `name` to the front of the recent searches (case-insensitive dedupe). */
export function rememberRecentSearch(name) {
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean) return loadRecentSearches();

  const next = [
    clean,
    ...loadRecentSearches().filter(
      (saved) => saved.toLowerCase() !== clean.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch (e) {
    logger.warn("Failed to save recent searches", e);
  }
  return next;
}

/** Replaces a renamed player's old name in the recent searches, keeping its place. */
export function renameRecentSearch(oldName, newName) {
  const clean = typeof newName === "string" ? newName.trim() : "";
  const old = typeof oldName === "string" ? oldName.trim().toLowerCase() : "";
  const current = loadRecentSearches();
  if (!clean || !old || !current.some((saved) => saved.toLowerCase() === old)) {
    return current;
  }

  const next = current
    .map((saved) => (saved.toLowerCase() === old ? clean : saved))
    .filter(
      (saved, index, all) =>
        all.findIndex((other) => other.toLowerCase() === saved.toLowerCase()) ===
        index,
    );
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch (e) {
    logger.warn("Failed to save recent searches", e);
  }
  return next;
}
