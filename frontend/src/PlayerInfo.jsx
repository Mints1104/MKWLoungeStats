import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";
import PlayerNameInput from "./components/PlayerNameInput";
import { useSettings } from "./context/settingsContext";
import { useSeasonMmrSelection } from "./hooks/useSeasonMmrSelection";
import { useFavourites } from "./hooks/useFavourites";
import { CURRENT_SEASON } from "./config/seasons";
import { loadRecentSearches } from "./utils/recentSearches";
import { getProfilePath } from "./utils/playerLinks";

const SEASON_KEY = "playerInfoSeason";
const MMR_TYPE_KEY = "playerInfoMmrType";

function readSessionItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Home page: search for a player and open their profile. The profile URL is the
 * shareable result; recent searches and favourites are shortcuts to it.
 */
function PlayerInfo() {
  const navigate = useNavigate();
  const { defaultGameMode } = useSettings();
  const { favourites, toggleFavourite } = useFavourites();
  const [recent] = useState(loadRecentSearches);
  const [name, setName] = useState("");

  const { season, setSeason, selectedMmrType, setSelectedMmrType, mmrType } =
    useSeasonMmrSelection({
      initialSeason: () => {
        const saved = readSessionItem(SEASON_KEY);
        return saved !== null ? Number(saved) : CURRENT_SEASON;
      },
      initialMmrType: () => readSessionItem(MMR_TYPE_KEY),
      defaultMmrType: defaultGameMode,
    });

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

  const openProfile = (playerName) => {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    navigate(getProfilePath(trimmed, season, mmrType));
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
            openProfile(name);
          }}
        >
          <PlayerNameInput
            id="player-search"
            value={name}
            onChange={setName}
            onSelect={openProfile}
            season={season}
            mmrType={mmrType}
          />

          <div className="season-selector-container">
            <SeasonSelector selectedSeason={season} onSeasonChange={setSeason} />
            {season >= 2 && (
              <MMRSelector
                selectedMMR={mmrType}
                onMMRChange={setSelectedMmrType}
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
          <div className="shortcut-group">
            <h2 className="shortcut-heading">Recent</h2>
            <div className="recent-searches">
              {recent.map((recentName) => (
                <Link
                  key={recentName}
                  className="recent-chip"
                  to={getProfilePath(recentName, season, mmrType)}
                >
                  {recentName}
                </Link>
              ))}
            </div>
          </div>
        )}

        {favourites.length > 0 && (
          <div className="shortcut-group">
            <h2 className="shortcut-heading">Favourites</h2>
            <ul className="recent-searches favourite-list">
              {favourites.map((favourite) => (
                <li key={favourite} className="favourite-chip">
                  <Link
                    className="recent-chip"
                    to={getProfilePath(favourite, season, mmrType)}
                  >
                    <span aria-hidden="true">★ </span>
                    {favourite}
                  </Link>
                  <button
                    type="button"
                    className="favourite-remove"
                    onClick={() => toggleFavourite(favourite)}
                    aria-label={`Remove ${favourite} from favourites`}
                    title="Remove from favourites"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerInfo;
