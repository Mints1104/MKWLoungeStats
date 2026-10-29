import { useEffect, useState } from "react";
import { getGameId, loungeApi } from "../api/loungeApi";
import logger from "../utils/logger";

export const MIN_SUGGESTION_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 8;

// Per page load; typing back over a prefix reuses its answer instead of another
// request (the API is rate limited per IP).
const suggestionCache = new Map();

/** Forgets cached suggestions (for tests). */
export function clearSuggestionCache() {
  suggestionCache.clear();
}

function suggestionKey(query, season, mmrType) {
  return `${getGameId(season, mmrType)}|${season}|${query.toLowerCase()}`;
}

/**
 * Player-name suggestions from the leaderboard search for the given ladder,
 * debounced, once the query has MIN_SUGGESTION_LENGTH characters.
 * @param {string} query - What the user has typed
 * @param {number} season - Season to search
 * @param {number} mmrType - MMR type (12 or 24); ignored before season 2
 * @returns {{ suggestions: Array<{ name: string, mmr: number, countryCode: string }>, loading: boolean }}
 */
export function usePlayerSuggestions(query, season, mmrType) {
  const trimmed = typeof query === "string" ? query.trim() : "";
  const key =
    trimmed.length >= MIN_SUGGESTION_LENGTH ?
      suggestionKey(trimmed, season, mmrType)
    : null;
  const [result, setResult] = useState({ key: null, suggestions: [] });

  useEffect(() => {
    if (!key || suggestionCache.has(key)) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await loungeApi.getLeaderboard(
          {
            search: trimmed,
            page: 1,
            pageSize: MAX_SUGGESTIONS,
            sortBy: "mmr",
            season,
            mmrType,
          },
          controller.signal,
        );
        const suggestions = (data?.data || []).map((player) => ({
          name: player.name,
          mmr: player.mmr,
          countryCode: player.countryCode,
        }));
        suggestionCache.set(key, suggestions);
        setResult({ key, suggestions });
      } catch (err) {
        if (err?.name !== "AbortError") {
          logger.warn("Failed to load player suggestions", err);
          setResult({ key, suggestions: [] });
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, trimmed, season, mmrType]);

  if (!key) return { suggestions: [], loading: false };
  if (suggestionCache.has(key)) {
    return { suggestions: suggestionCache.get(key), loading: false };
  }
  return {
    suggestions: result.key === key ? result.suggestions : [],
    loading: result.key !== key,
  };
}

export default usePlayerSuggestions;
