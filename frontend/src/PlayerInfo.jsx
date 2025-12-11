import { useState } from "react";

function formatTimeAgo(dateInput) {
    const ms =
        typeof dateInput === "number"
            ? dateInput.toString().length === 10
                ? dateInput * 1000
                : dateInput
            : new Date(dateInput).getTime();

    const diff = Date.now() - ms;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
}

function getNextRank(mmr) {
    const ranks = [
        { name: "Iron", min: 0, max: 1999 },
        { name: "Bronze", min: 2000, max: 3499 },
        { name: "Silver", min: 3500, max: 4999 },
        { name: "Gold", min: 5000, max: 6499 },
        { name: "Platinum", min: 6500, max: 7999 },
        { name: "Sapphire", min: 8000, max: 9499 },
        { name: "Ruby", min: 9500, max: 10999 },
        { name: "Diamond", min: 11000, max: 12499 },
        { name: "Master", min: 12500, max: 13499 },
        { name: "Grandmaster", min: 13500, max: Infinity },
    ];

    for (let i = 0; i < ranks.length; i++) {
        const rank = ranks[i];
        if (mmr <= rank.max) {
            const nextRank = ranks[i + 1];
            if (!nextRank) {
                return "";
            }
            const mmrToNextRank = nextRank.min - mmr;
            return `${mmrToNextRank} MMR away from ${nextRank.name}`;
        }
    }

    return "";
}

function PlayerInfo() {
    const [name, setName] = useState("");
    const [detailedInfo, setDetailedInfo] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const getPlayerInfo = async () => {
        try {
            setError("");
            setDetailedInfo(null);

            if (!name.trim()) {
                setError("Please enter a name");
                return;
            }

            setLoading(true);
            const response = await fetch(
                `/api/player/details/${encodeURIComponent(name)}?season=1`,
            );

            if (!response.ok) {
                throw new Error("Failed to fetch player data");
            }

            const data = await response.json();
            setDetailedInfo(data);
        } catch (err) {
            setError(err.message || "Failed to fetch player data");
        } finally {
            setLoading(false);
        }
    };

    // Derived stats for 12p / 24p events
    let twelveCount = 0;
    let twentyFourCount = 0;
    let avg12 = null;
    let avg24 = null;

    if (detailedInfo && Array.isArray(detailedInfo.mmrChanges)) {
        const twelves = detailedInfo.mmrChanges.filter((e) => e.numPlayers === 12);
        const twentyFours = detailedInfo.mmrChanges.filter((e) => e.numPlayers === 24);

        twelveCount = twelves.length;
        twentyFourCount = twentyFours.length;

        if (twelveCount) {
            const sum12 = twelves.reduce((acc, e) => acc + (e.score ?? 0), 0);
            avg12 = sum12 / twelveCount;
        }

        if (twentyFourCount) {
            const sum24 = twentyFours.reduce((acc, e) => acc + (e.score ?? 0), 0);
            avg24 = sum24 / twentyFourCount;
        }
    }

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

                {error && <p className="player-error">{error}</p>}
                {loading && <p className="player-loading">Loading...</p>}
            </div>

            {detailedInfo && (
                <div className="player-results">
                    <div className="player-summary">
                        <h2>Stats for {detailedInfo.name}</h2>
                        <p>Player ID: {detailedInfo.playerId}</p>
                        <p>Overall Rank: {detailedInfo.overallRank}</p>
                        <p>Current Rank: {detailedInfo.rank}</p>
                        <p>{getNextRank(detailedInfo.mmr)}</p>
                        <p>Current MMR: {detailedInfo.mmr}</p>
                        <p>Highest MMR: {detailedInfo.maxMmr}</p>
                        <p>
                            Average Score:{" "}
                            {detailedInfo.averageScore != null
                                ? detailedInfo.averageScore.toFixed(2)
                                : "N/A"}
                            {" "}
                            (
                            {avg12 != null
                                ? `${avg12.toFixed(2)} 12p`
                                : "N/A 12p"}
                            {" / "}
                            {avg24 != null
                                ? `${avg24.toFixed(2)} 24p`
                                : "N/A 24p"}
                            )
                        </p>
                        <p>
                            Total Events Played: {detailedInfo.eventsPlayed} (
                            {twelveCount} 12p / {twentyFourCount} 24p)
                        </p>
                        <p
                            className={`player-winrate ${
                                detailedInfo.winRate >= 0.5 ? "positive" : "negative"
                            }`}
                        >
                            Win Rate: {(detailedInfo.winRate * 100).toFixed(2)}%
                        </p>
                    </div>

                    <div className="player-events">
                        <h3>Last 10 Events</h3>
                        <div className="events-grid">
                            {detailedInfo?.mmrChanges?.slice(0, 10).map((event, index) => (
                                <article className="event-card" key={index}>
                                    <div className="event-header">
                                        <p className="event-score">
                                            Scored{" "}
                                            <span
                                                className={
                                                    event.score > detailedInfo.averageScore
                                                        ? "above-average"
                                                        : ""
                                                }
                                            >
                                                {event.score}
                                            </span>{" "}
                                            in a {event.numPlayers}p event
                                        </p>

                                        <p
                                            className={`event-delta ${
                                                event.mmrDelta > 0 ? "positive" : "negative"
                                            }`}
                                        >
                                            {event.mmrDelta > 0 ? "+" : ""}
                                            {event.mmrDelta}
                                        </p>
                                    </div>
                                    <p className="event-mmr">New MMR: {event.newMmr}</p>
                                    <p className="event-time">
                                        Played {formatTimeAgo(event.time)}
                                    </p>
                                    <a
                                        className="event-link"
                                        href={`https://lounge.mkcentral.com/mkworld/TableDetails/${event.changeId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View Table
                                    </a>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlayerInfo;
