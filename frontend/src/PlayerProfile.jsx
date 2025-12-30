import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";

function PlayerProfile() {
    const { playerName } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // safely get season from URL, handling 0 correctly
    const seasonParam = searchParams.get("season");
    const season = seasonParam !== null && !isNaN(seasonParam) ? Number(seasonParam) : 1;

    const handleSeasonChange = (newSeason) => {
        setSearchParams({ season: newSeason }, { replace: true });
    };

    const { playerDetails: detailedInfo, loading, error, fetchPlayerDetails } = usePlayerDetails();

    useEffect(() => {
        if (playerName) {
            fetchPlayerDetails(playerName, season);
        }
    }, [playerName, season, fetchPlayerDetails]);

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

                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <SeasonSelector selectedSeason={season} onSeasonChange={handleSeasonChange} />
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
                    gradientIdPrefix="mmrGradient-profile"
                />
            )}
        </div>
    );
}

export default PlayerProfile;
