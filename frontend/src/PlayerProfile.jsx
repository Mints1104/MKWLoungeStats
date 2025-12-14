import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";
import PageHeader from "./components/PageHeader";

function PlayerProfile() {
    const { playerName } = useParams();
    const navigate = useNavigate();
    const { playerDetails: detailedInfo, loading, error, fetchPlayerDetails } = usePlayerDetails();

    useEffect(() => {
        if (playerName) {
            fetchPlayerDetails(playerName);
        }
    }, [playerName, fetchPlayerDetails]);

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
                        style={{ marginBottom: '1rem', width: 'auto' }}
                    >
                        ← Back
                    </button>
                </PageHeader>

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
