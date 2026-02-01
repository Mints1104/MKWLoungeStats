import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";

function PlayerProfile() {
    const { playerName } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // safely get season from URL, handling 0 correctly
    const seasonParam = searchParams.get("season");
    const season = seasonParam !== null && !isNaN(seasonParam) ? Number(seasonParam) : 2;

    const handleSeasonChange = (newSeason) => {
        setSearchParams({ season: newSeason }, { replace: true });
    };

    const [mmrType, setMmrType] = useState(24);

    const { playerDetails: detailedInfo, loading, error, fetchPlayerDetails } = usePlayerDetails();

    useEffect(() => {
        if (playerName) {
            fetchPlayerDetails(playerName, season, mmrType);
        }
    }, [playerName, season, mmrType, fetchPlayerDetails]);

    const handleBack = () => {
        if (window.history.length <= 1) {
            navigate("/leaderboard");
            return;
        }
        navigate(-1);
    };

    return (
        <div className="player-info-page">
            <div className="player-card">
                <PageHeader
                    title="Player Profile"
                    subtitle={`Viewing stats for ${detailedInfo?.name || playerName}`}
                >
                    <button
                        className="player-button"
                        onClick={handleBack}
                        style={{ marginBottom: '0', width: 'auto' }}
                    >
                        ← Back
                    </button>
                </PageHeader>

                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <SeasonSelector selectedSeason={season} onSeasonChange={handleSeasonChange} />
                    {season >= 2 && (
                        <MMRSelector
                            selectedMMR={mmrType}
                            onMMRChange={setMmrType}
                        />
                    )}
                </div>

                {error && (
                    <p className="player-error" role="alert" aria-live="assertive">
                        {error}
                    </p>
                )}
                {loading && (
                    <div className="loading-skeleton" aria-live="polite" aria-label="Loading player data">
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
                />
            )}
        </div>
    );
}

export default PlayerProfile;
