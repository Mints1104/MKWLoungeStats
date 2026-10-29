import { useEffect, useState } from "react";
import { getGameId, loungeApi } from "../api/loungeApi";
import { getThresholds, parseRankThresholds } from "../utils/playerUtils";

// One request per ladder per page load, shared by every component that asks. A
// failed request is forgotten so the next caller can retry.
const thresholdRequests = new Map();

function thresholdKey(season, mmrType) {
  return `${getGameId(season, mmrType)}|${season}`;
}

function loadRankThresholds(season, mmrType) {
  const key = thresholdKey(season, mmrType);

  if (!thresholdRequests.has(key)) {
    const request = Promise.resolve()
      .then(() =>
        loungeApi.getPlayerStats({ season, game: getGameId(season, mmrType) }),
      )
      .then((stats) => parseRankThresholds(stats?.ranks))
      .catch(() => null)
      .then((thresholds) => {
        if (!thresholds) thresholdRequests.delete(key);
        return thresholds;
      });
    thresholdRequests.set(key, request);
  }

  return thresholdRequests.get(key);
}

/** Forgets loaded thresholds (for tests). */
export function clearRankThresholdCache() {
  thresholdRequests.clear();
}

/**
 * Rank thresholds for a season and ladder as the Lounge API publishes them
 * (`/player/stats` → `ranks`), so a season that changes them needs no code change.
 * Returns the bundled tables from getThresholds until the API answers, if it
 * can't be reached, or while `season` is still unknown (null).
 * @param {number|null} season - Season number.
 * @param {number} mmrType - MMR type (12 or 24); ignored before season 2.
 * @returns {Array} `{ name, min, max }[]`
 */
export function useRankThresholds(season, mmrType) {
  const hasSeason = season != null && Number.isFinite(Number(season));
  const key = hasSeason ? thresholdKey(season, mmrType) : null;
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (!key) return undefined;

    let active = true;
    loadRankThresholds(season, mmrType).then((thresholds) => {
      if (active && thresholds) {
        setLoaded({ key, thresholds });
      }
    });

    return () => {
      active = false;
    };
  }, [key, season, mmrType]);

  return key && loaded?.key === key ?
      loaded.thresholds
    : getThresholds(season, mmrType);
}

export default useRankThresholds;
