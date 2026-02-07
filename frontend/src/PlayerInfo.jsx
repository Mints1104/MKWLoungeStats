import { useState, useEffect, useCallback } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";

const RECENT_KEY = "recentPlayerSearches";
const LAST_DETAILS_KEY = "lastPlayerDetails";

function PlayerInfo() {
  // 1. Initialize 'recent' lazily from localStorage
  const [recent, setRecent] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(saved) ? saved.slice(0, 3) : [];
    } catch (e) {
      console.warn("Failed to load recent searches", e);
      return [];
    }
  });

  // 2. Initialize 'name' and 'initialDetails' lazily from sessionStorage
  const [initialState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(LAST_DETAILS_KEY);
      if (!raw) return { name: "", details: null };
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && parsed.data) {
        return { name: parsed.name, details: parsed.data };
      }
    } catch (e) {
      console.warn("Failed to restore last player details", e);
    }
    return { name: "", details: null };
  });

  const [name, setName] = useState(initialState.name);
  const [season, setSeason] = useState(2);
  const [mmrType, setMmrType] = useState(24);

  // 3. Pass initialDetails to the hook
  const {
    playerDetails: detailedInfo,
    loading,
    error,
    fetchPlayerDetails,
  } = usePlayerDetails(initialState.details);
  const rememberRecent = (value) => {
    const clean = value.trim();
    if (!clean) return;
    const deduped = [
      clean,
      ...recent.filter((n) => n.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, 3);
    setRecent(deduped);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(deduped));
    } catch (e) {
      console.warn("Failed to save recent searches", e);
    }
  };

  const rememberLastDetails = (playerName, data) => {
    if (!data) return;
    try {
      sessionStorage.setItem(
        LAST_DETAILS_KEY,
        JSON.stringify({ name: playerName, data }),
      );
    } catch (e) {
      console.warn("Failed to save last player details", e);
    }
  };

  const getPlayerInfo = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const data = await fetchPlayerDetails(trimmed, season, mmrType);
    if (data) {
      rememberRecent(trimmed);
      rememberLastDetails(trimmed, data);
    }
  }, [name, season, mmrType, fetchPlayerDetails]);

  // Auto-fetch when season or mmrType changes, if we have a valid name
  useEffect(() => {
    if (name.trim()) {
      getPlayerInfo();
    }
  }, [name, season, mmrType, getPlayerInfo]);

  return (
    <div className="player-info-page">
      <div className="player-card">
        <PageHeader
          title="Mario Kart Lounge Stats"
          subtitle="Look up a player by name and see their stats."
        ></PageHeader>

        <form
          className="player-form"
          onSubmit={(e) => {
            e.preventDefault();
            getPlayerInfo();
          }}
        >
          <input
            className="player-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a player name"
            aria-label="Player name"
          />

          <div className="season-selector-container">
            <SeasonSelector
              selectedSeason={season}
              onSeasonChange={setSeason}
            />
            {season >= 2 && (
              <MMRSelector selectedMMR={mmrType} onMMRChange={setMmrType} />
            )}
          </div>

          <button
            type="submit"
            className="player-button"
            disabled={!name.trim()}
          >
            Get Player Info
          </button>
        </form>

        {recent.length > 0 && (
          <div className="recent-searches" aria-label="Recent searches">
            {recent.map((r) => (
              <button
                key={r}
                className="recent-chip"
                onClick={() => {
                  setName(r);
                  fetchPlayerDetails(r, season, mmrType).then((data) => {
                    if (data) {
                      rememberRecent(r);
                      rememberLastDetails(r, data);
                    }
                  });
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="player-error" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {loading && (
          <div
            className="loading-skeleton"
            aria-live="polite"
            aria-label="Loading player data"
          >
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        )}
      </div>

      {detailedInfo && (
        <PlayerDetailView
          playerDetails={detailedInfo}
          season={season}
          mmrType={mmrType}
          gradientIdPrefix="mmrGradient-info"
        />
      )}
    </div>
  );
}

export default PlayerInfo;
