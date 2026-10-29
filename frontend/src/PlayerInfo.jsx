import { useState, useEffect } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";
import { useSettings } from "./context/settingsContext";
import { useSeasonMmrSelection } from "./hooks/useSeasonMmrSelection";
import { CURRENT_SEASON } from "./config/seasons";
import logger from "./utils/logger";

const RECENT_KEY = "recentPlayerSearches";
const LAST_DETAILS_KEY = "lastPlayerDetails";
const SEASON_KEY = "playerInfoSeason";
const MMR_TYPE_KEY = "playerInfoMmrType";

function readSessionItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function PlayerInfo() {
  const { defaultGameMode } = useSettings();

  // 1. Initialize 'recent' lazily from localStorage
  const [recent, setRecent] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(saved) ? saved.slice(0, 3) : [];
    } catch (e) {
      logger.warn("Failed to load recent searches", e);
      return [];
    }
  });

  // 2. Initialize 'name' and 'initialDetails' lazily from sessionStorage, along
  // with the season and MMR type they were fetched for (absent in older entries)
  const [initialState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(LAST_DETAILS_KEY);
      if (!raw) return { name: "", details: null };
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && parsed.data) {
        return {
          name: parsed.name,
          details: parsed.data,
          season: parsed.season,
          mmrType: parsed.mmrType,
        };
      }
    } catch (e) {
      logger.warn("Failed to restore last player details", e);
    }
    return { name: "", details: null };
  });

  const [name, setName] = useState(initialState.name);
  // Restored details must be shown with the season and MMR type they were fetched
  // for, or ranks are drawn against the wrong thresholds.
  const { season, setSeason, selectedMmrType, setSelectedMmrType, mmrType } =
    useSeasonMmrSelection({
      initialSeason: () => {
        if (initialState.season != null) return initialState.season;
        const saved = readSessionItem(SEASON_KEY);
        return saved !== null ? Number(saved) : CURRENT_SEASON;
      },
      initialMmrType: () => initialState.mmrType ?? readSessionItem(MMR_TYPE_KEY),
      defaultMmrType: defaultGameMode,
    });

  // 3. Pass initialDetails to the hook
  const {
    playerDetails: detailedInfo,
    loading,
    error,
    fetchPlayerDetails,
  } = usePlayerDetails(initialState.details);

  // Persist season and MMR type selection across page reloads
  useEffect(() => {
    try {
      sessionStorage.setItem(SEASON_KEY, season);
    } catch {
      /* ignore */
    }
  }, [season]);

  useEffect(() => {
    try {
      if (selectedMmrType == null) {
        sessionStorage.removeItem(MMR_TYPE_KEY);
      } else {
        sessionStorage.setItem(MMR_TYPE_KEY, selectedMmrType);
      }
    } catch {
      /* ignore */
    }
  }, [selectedMmrType]);

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
      logger.warn("Failed to save recent searches", e);
    }
  };

  const rememberLastDetails = (playerName, data, seasonValue, mmrValue) => {
    if (!data) return;
    try {
      sessionStorage.setItem(
        LAST_DETAILS_KEY,
        JSON.stringify({
          name: playerName,
          data,
          season: seasonValue,
          // Pre-split seasons have no 12p/24p ladder, so there is nothing to pin
          mmrType: Number(seasonValue) >= 2 ? mmrValue : null,
        }),
      );
    } catch (e) {
      logger.warn("Failed to save last player details", e);
    }
  };

  const fetchAndRemember = async (playerName, seasonValue, mmrValue) => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      return null;
    }

    const data = await fetchPlayerDetails(trimmed, seasonValue, mmrValue);
    if (data) {
      rememberRecent(trimmed);
      rememberLastDetails(trimmed, data, seasonValue, mmrValue);
    }
    return data;
  };

  const getPlayerInfo = async () => {
    return fetchAndRemember(name, season, mmrType);
  };

  const handleSeasonChange = (nextSeason) => {
    setSeason(nextSeason);
    if (name.trim()) {
      fetchAndRemember(name, nextSeason, mmrType);
    }
  };

  const handleMmrChange = (nextMmrType) => {
    setSelectedMmrType(nextMmrType);
    if (name.trim()) {
      fetchAndRemember(name, season, nextMmrType);
    }
  };

  return (
    <div className="player-info-page">
      <div className="player-card">
        <PageHeader
          title="Mario Kart World Lounge Stats"
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
              onSeasonChange={handleSeasonChange}
            />
            {season >= 2 && (
              <MMRSelector
                selectedMMR={mmrType}
                onMMRChange={handleMmrChange}
              />
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
                  fetchAndRemember(r, season, mmrType);
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
