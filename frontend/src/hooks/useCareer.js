import { useCallback, useState } from "react";
import { loungeApi } from "../api/loungeApi";
import { useAbortableRequest } from "./useAbortableRequest";
import { getAllLadders } from "../config/seasons";

const CLOSED = { name: null, open: false, rows: null, failedCount: 0 };

/**
 * One player's record on every season and ladder, loaded on demand (one request per
 * ladder, six for seasons 0-3). Owned by the profile page rather than the career
 * card, so it stays open and loaded while the profile reloads for another season
 * (e.g. after picking a row in the career table). Resets for a different player.
 * @param {string} playerName
 * @returns {{
 *   open: boolean, rows: Array|null, failedCount: number, loading: boolean,
 *   error: string, load: Function,
 * }} rows: `{ season, mmrType, details }[]`, ladders played only
 */
export function useCareer(playerName) {
  const [state, setState] = useState(CLOSED);
  const { loading, error, run } = useAbortableRequest();
  const current = state.name === playerName ? state : CLOSED;

  const load = useCallback(() => {
    setState({ ...CLOSED, name: playerName, open: true });

    run(
      async (signal) => {
        const ladders = getAllLadders();
        const settled = await Promise.allSettled(
          ladders.map((ladder) =>
            loungeApi.getPlayerDetails(
              playerName,
              ladder.season,
              ladder.mmrType ?? 24,
              signal,
            ),
          ),
        );

        const aborted = settled.find(
          (result) => result.reason?.name === "AbortError",
        );
        if (aborted) throw aborted.reason;

        const played = [];
        let failed = 0;
        settled.forEach((result, index) => {
          if (result.status === "fulfilled") {
            // The API answers for ladders never played too, as a 0-event
            // "Placement" record
            if ((result.value?.eventsPlayed ?? 0) > 0) {
              played.push({ ...ladders[index], details: result.value });
            }
          } else if (result.reason?.status !== 404) {
            // 404 just means no games on that ladder
            failed += 1;
          }
        });
        return { played, failed };
      },
      { mapError: (err) => err.message || "Failed to load career" },
    ).then((data) => {
      if (data) {
        setState((previous) =>
          previous.name === playerName ?
            { ...previous, rows: data.played, failedCount: data.failed }
          : previous,
        );
      }
    });
  }, [playerName, run]);

  return {
    open: current.open,
    rows: current.rows,
    failedCount: current.failedCount,
    loading: current.open && loading,
    error: current.open ? error : "",
    load,
  };
}

export default useCareer;
