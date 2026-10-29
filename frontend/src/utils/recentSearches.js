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
