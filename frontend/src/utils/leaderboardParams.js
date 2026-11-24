// Leaderboard URL params are typed or edited by hand; anything the API would reject
// (it takes non-negative integers only) falls back instead of becoming a 400.

export const PAGE_SIZE_OPTIONS = [25, 50, 100];
export const DEFAULT_PAGE_SIZE = 50;

/** MMR / events-played bounds, in the order the filter inputs show them. */
export const RANGE_FILTER_KEYS = [
  "minMmr",
  "maxMmr",
  "minEventsPlayed",
  "maxEventsPlayed",
];

/** A 1-based page number, or 1. */
export function parsePageParam(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/** One of PAGE_SIZE_OPTIONS (the API caps pages at 100), or the default. */
export function parsePageSizeParam(value) {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

/**
 * A range filter as the API accepts it: a non-negative integer as a string, or ""
 * (no filter) for anything else, such as "-5", "1.5" or a half-typed "1e".
 */
export function cleanRangeValue(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return /^\d{1,9}$/.test(trimmed) ? String(Number(trimmed)) : "";
}

/** Every range filter from `source` (a URLSearchParams or plain object), cleaned. */
export function cleanRangeFilters(source) {
  const get = (key) =>
    typeof source?.get === "function" ? source.get(key) : source?.[key];
  return Object.fromEntries(
    RANGE_FILTER_KEYS.map((key) => [key, cleanRangeValue(get(key) ?? "")]),
  );
}
