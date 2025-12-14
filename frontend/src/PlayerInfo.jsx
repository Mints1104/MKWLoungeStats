import { useState } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";

function PlayerInfo() {
    const [name, setName] = useState("");
    const { playerDetails: detailedInfo, loading, error, fetchPlayerDetails } = usePlayerDetails();

    const getPlayerInfo = async () => {
        await fetchPlayerDetails(name);
    };

    return (
        <div className="player-info-page">
            <div className="player-card">
                <h1 className="player-title">Mario Kart Lounge Stats</h1>
                <p className="player-subtitle">
                    Look up a player by name and see their recent event history.
                </p>

                <div className="player-form">
                    <input
                        className="player-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter a player name"
                    />
                    <button className="player-button" onClick={getPlayerInfo}>
                        Get Player Info
                    </button>
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
                    gradientIdPrefix="mmrGradient-info" 
                />
            )}
        </div>
    );
}

export default PlayerInfo;
