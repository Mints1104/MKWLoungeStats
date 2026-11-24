import { useState, useCallback } from "react";
import { loungeApi } from "../api/loungeApi";
import { useAbortableRequest } from "./useAbortableRequest";
import { CURRENT_SEASON } from "../config/seasons";

/**
 * Shared hook for requesting detailed player information from the backend.
 * Returns the fetched data, loading and error state, plus an imperative fetch helper.
 */
function usePlayerDetails(initialData = null) {
  const [playerDetails, setPlayerDetails] = useState(initialData);
  // True when the last request was a 404 (no player by that name, e.g. renamed)
  const [notFound, setNotFound] = useState(false);
  const { loading, error, setError, run } = useAbortableRequest();

  const fetchPlayerDetails = useCallback(
    async (playerName, season = CURRENT_SEASON, mmrType = 24) => {
      if (!playerName || !playerName.trim()) {
        setError("Please enter a name");
        setPlayerDetails(null);
        return null;
      }

      setPlayerDetails(null);
      setNotFound(false);

      const data = await run(
        (signal) =>
          loungeApi.getPlayerDetails(playerName, season, mmrType, signal),
        {
          mapError: (err) => {
            setNotFound(err.status === 404);
            let message = err.message || "Failed to fetch player data";
            if (message.includes("404")) {
              message = `No lounge records found for "${playerName}"`;
            }
            return message;
          },
        },
      );

      if (data) {
        setPlayerDetails(data);
      } else {
        setPlayerDetails(null);
      }
      return data;
    }, [run, setError],
  );

  return {
    playerDetails,
    loading,
    error,
    notFound,
    fetchPlayerDetails,
    setPlayerDetails,
  };
}

export default usePlayerDetails;
