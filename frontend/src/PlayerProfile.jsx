import {
  Link,
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useEffect } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import { useCareer } from "./hooks/useCareer";
import { TbArrowLeft, TbArrowsLeftRight } from "react-icons/tb";
import PlayerDetailView from "./components/PlayerDetailView";
import SeasonSelector from "./components/SeasonSelector";
import FilterToggle from "./components/FilterToggle";
import FavouriteButton from "./components/FavouriteButton";
import CopyLinkButton from "./components/CopyLinkButton";
import CareerView from "./components/CareerView";
import { useSettings } from "./context/settingsContext";
import { rememberRecentSearch } from "./utils/recentSearches";
import { getComparePath } from "./utils/playerLinks";
import { getRankColor } from "./utils/playerUtils";
import { brightenForDarkBackground } from "./utils/chartUtils";
import {
  parseNullableMmrType,
  parseSeasonValue,
} from "./hooks/useSeasonMmrSelection";

// Two ladders: a toggle switches in one tap where a dropdown took two
const LADDER_OPTIONS = [
  { value: 24, label: "24p" },
  { value: 12, label: "12p" },
];

function PlayerProfile() {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { defaultGameMode } = useSettings();

  const season = parseSeasonValue(searchParams.get("season"));
  const mmrType = parseNullableMmrType(searchParams.get("mmrType")) ?? defaultGameMode;

  const handleSeasonChange = (newSeason) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("season", newSeason);
    setSearchParams(newParams, { replace: true });
  };

  const handleMmrTypeChange = (newMmrType) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("mmrType", newMmrType);
    setSearchParams(newParams, { replace: true });
  };

  const {
    playerDetails: detailedInfo,
    loading,
    error,
    fetchPlayerDetails,
  } = usePlayerDetails();

  useEffect(() => {
    if (!playerName) return;
    fetchPlayerDetails(playerName, season, mmrType).then((data) => {
      // Only names that resolve to a player become recent searches
      if (data?.name) rememberRecentSearch(data.name);
    });
  }, [playerName, season, mmrType, fetchPlayerDetails]);

  const handleSelectLadder = (nextSeason, nextMmrType) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("season", nextSeason);
    if (nextMmrType != null) newParams.set("mmrType", nextMmrType);
    // A new history entry: scroll restoration takes it to the top
    setSearchParams(newParams);
  };

  const displayName = detailedInfo?.name || playerName;

  const career = useCareer(playerName);
  const careerSection = playerName && (
    <CareerView
      career={career}
      playerName={playerName}
      season={season}
      mmrType={mmrType}
      onSelectLadder={handleSelectLadder}
    />
  );

  const handleBack = () => {
    // "default" is the key of the entry the app was opened on: there is no in-app
    // page to go back to (window.history.length also counts other sites' entries).
    if (location.key === "default") {
      navigate("/leaderboard");
      return;
    }
    navigate(-1);
  };

  return (
    <div className="player-info-page">
      <div className="player-card profile-header">
        <button type="button" className="back-link" onClick={handleBack}>
          <TbArrowLeft aria-hidden="true" />
          Back
        </button>

        <div className="profile-header-grid">
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1 className="profile-name">{displayName}</h1>
              <FavouriteButton name={displayName} className="favourite-button-inline" />
            </div>
            {detailedInfo && (
              <p className="profile-meta">
                <span
                  style={{
                    color: brightenForDarkBackground(getRankColor(detailedInfo.rank)),
                  }}
                >
                  {detailedInfo.rank}
                </span>
                {detailedInfo.overallRank != null && ` · #${detailedInfo.overallRank}`}
                {detailedInfo.mmr != null &&
                  ` · ${detailedInfo.mmr.toLocaleString()} MMR`}
              </p>
            )}
          </div>

          <div className="profile-actions">
            <CopyLinkButton variant="icon" />
            <Link
              className="icon-button"
              to={getComparePath([displayName], season, mmrType)}
              aria-label={`Compare ${displayName} with other players`}
              title="Compare with other players"
            >
              <TbArrowsLeftRight aria-hidden="true" />
            </Link>
          </div>

          <div className="profile-selectors">
            <SeasonSelector
              selectedSeason={season}
              onSeasonChange={handleSeasonChange}
            />
            {season >= 2 && (
              <FilterToggle
                activeFilter={mmrType}
                onFilterChange={handleMmrTypeChange}
                options={LADDER_OPTIONS}
                ariaLabel="Ladder"
              />
            )}
          </div>
        </div>

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
          gradientIdPrefix="mmrGradient-profile"
          careerSection={careerSection}
        />
      )}

      {/* No record on this ladder: the career still shows where they did play */}
      {!detailedInfo && !loading && careerSection}
    </div>
  );
}

export default PlayerProfile;
