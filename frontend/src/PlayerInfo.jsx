import { useEffect, useState } from "react";
import usePlayerDetails from "./hooks/usePlayerDetails";
import PlayerDetailView from "./components/PlayerDetailView";
import PageHeader from "./components/PageHeader";

const RECENT_KEY = "recentPlayerSearches";

function PlayerInfo() {
    const [name, setName] = useState("");
    const [recent, setRecent] = useState([]);
    const { playerDetails: detailedInfo, loading, error, fetchPlayerDetails } = usePlayerDetails();

    // Load recent searches once on mount
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
            if (Array.isArray(saved)) {
                setRecent(saved.slice(0, 3));
            }
        } catch (e) {
            console.warn("Failed to load recent searches", e);
        }
    }, []);

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

    const getPlayerInfo = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            return;
        }

        const data = await fetchPlayerDetails(trimmed);
        if (data) {
            rememberRecent(trimmed);
        }
    };

    return (
        <div className="player-info-page">
            <div className="player-card">
                <PageHeader 
                    title="Mario Kart Lounge Stats" 
                    subtitle="Look up a player by name and see their stats!" 
                />

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
                    />
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
                                    fetchPlayerDetails(r).then((data) => {
                                        if (data) rememberRecent(r);
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
