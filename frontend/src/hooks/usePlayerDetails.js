import { useState, useRef, useCallback, useEffect } from "react";
import { loungeApi } from "../api/loungeApi";

/**
 * Shared hook for requesting detailed player information from the backend.
 * Returns the fetched data, loading and error state, plus an imperative fetch helper.
 */
function usePlayerDetails() {
  const [playerDetails, setPlayerDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlightRef = useRef(null);

  const fetchPlayerDetails = useCallback(async (playerName, season = 1) => {
    if (!playerName || !playerName.trim()) {
      setError("Please enter a name");
      setPlayerDetails(null);
      return null;
    }

    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }

    const controller = new AbortController();
    inFlightRef.current = controller;

    try {
      setError("");
      setLoading(true);
      setPlayerDetails(null);

      const data = await loungeApi.getPlayerDetails(
        playerName,
        season,
        controller.signal
      );

      setPlayerDetails(data);
      return data;
    } catch (err) {
      if (err.name === "AbortError") {
        return null;
      }

      let message = err.message || "Failed to fetch player data";
      if (message.includes("404")) {
        message = `No lounge records found for "${playerName}"`;
      }

      setError(message);
      setPlayerDetails(null);
      return null;
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (inFlightRef.current) {
        inFlightRef.current.abort();
        inFlightRef.current = null;
      }
    };
  }, []);

  return {
    playerDetails,
    loading,
    error,
    fetchPlayerDetails,
  };
}

export default usePlayerDetails;
