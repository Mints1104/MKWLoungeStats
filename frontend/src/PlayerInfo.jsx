import { useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

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

function getRankColor(rank) {
    if (!rank) return "#e5e7eb";

    const normalized = rank.toLowerCase();
    switch (normalized) {
        case "grandmaster":
            return "#A3022C";
        case "master":
            return "#9370DB";
        case "diamond":
            return "#B9F2FF";
        case "ruby":
            return "#D51C5E";
        case "sapphire":
            return "#286CD3";
        case "platinum":
            return "#3FABB8";
        case "gold":
            return "#F1C232";
        case "silver":
            return "#CCCCCC";
        case "bronze":
            return "#B45F06";
        case "iron":
            return "#817876";
        default:
            return "#e5e7eb";
    }
}

function PlayerInfo() {
    const [name, setName] = useState("");
    const [detailedInfo, setDetailedInfo] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [eventFilter, setEventFilter] = useState("all");
    const [eventLimit, setEventLimit] = useState(10);
    const [scoreFilter, setScoreFilter] = useState("all");

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
    let winRate12 = null;
    let winRate24 = null;

    if (detailedInfo && Array.isArray(detailedInfo.mmrChanges)) {
        const twelves = detailedInfo.mmrChanges.filter((e) => e.numPlayers === 12);
        const twentyFours = detailedInfo.mmrChanges.filter((e) => e.numPlayers === 24);

        twelveCount = twelves.length;
        twentyFourCount = twentyFours.length;

        if (twelveCount) {
            const sum12 = twelves.reduce((acc, e) => acc + (e.score ?? 0), 0);
            avg12 = sum12 / twelveCount;

            const wins12 = twelves.filter((e) => (e.mmrDelta ?? 0) > 0).length;
            winRate12 = wins12 / twelveCount;
        }

        if (twentyFourCount) {
            const sum24 = twentyFours.reduce((acc, e) => acc + (e.score ?? 0), 0);
            avg24 = sum24 / twentyFourCount;

            const wins24 = twentyFours.filter((e) => (e.mmrDelta ?? 0) > 0).length;
            winRate24 = wins24 / twentyFourCount;
        }
    }

    // Events to display based on filter and limit
    let eventsToShow = [];
    if (detailedInfo && Array.isArray(detailedInfo.mmrChanges)) {
        let filtered = detailedInfo.mmrChanges;
        if (eventFilter === "12") {
            filtered = filtered.filter((e) => e.numPlayers === 12);
        } else if (eventFilter === "24") {
            filtered = filtered.filter((e) => e.numPlayers === 24);
        }
        eventsToShow = filtered.slice(0, eventLimit);
    }

    // Stats for the currently displayed events
    let recentAvgScore = null;
    let recentBestScore = null;
    let recentWinRate = null;

    if (eventsToShow.length) {
        const withScores = eventsToShow.filter(
            (e) => typeof e.score === "number" && !Number.isNaN(e.score),
        );
        if (withScores.length) {
            const sum = withScores.reduce((acc, e) => acc + e.score, 0);
            recentAvgScore = sum / withScores.length;
            recentBestScore = withScores.reduce(
                (max, e) => (e.score > max ? e.score : max),
                withScores[0].score,
            );
        }

        const wins = eventsToShow.filter((e) => (e.mmrDelta ?? 0) > 0).length;
        recentWinRate = wins / eventsToShow.length;
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
                        <h2>
                            Stats for{" "}
                            <span style={{ color: getRankColor(detailedInfo.rank) }}>
                                {detailedInfo.name}
                            </span>
                        </h2>
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
                            {" "}
                            (
                            {winRate12 != null
                                ? `${(winRate12 * 100).toFixed(2)}% 12p`
                                : "N/A 12p"}
                            {" / "}
                            {winRate24 != null
                                ? `${(winRate24 * 100).toFixed(2)}% 24p`
                                : "N/A 24p"}
                            )
                        </p>
                    </div>

                    {/* MMR History Chart */}
                    <div className="player-summary">
                        <h3>MMR History</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={detailedInfo.mmrChanges
                                    ?.slice()
                                    .reverse()
                                    .map((event, index) => ({
                                        event: index + 1,
                                        mmr: event.newMmr,
                                        delta: event.mmrDelta,
                                    }))}
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="event"
                                    stroke="#9ca3af"
                                    label={{ value: "Events", position: "insideBottom", offset: -5 }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    label={{ value: "MMR", angle: -90, position: "insideLeft" }}
                                    domain={["dataMin - 50", "dataMax + 50"]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#0f172a",
                                        border: "1px solid #334155",
                                        borderRadius: "8px",
                                    }}
                                    labelStyle={{ color: "#e5e7eb" }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="mmr"
                                    stroke="#38bdf8"
                                    strokeWidth={2}
                                    dot={{ fill: "#38bdf8", r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Score Distribution Chart */}
                    <div className="player-summary">
                        <div className="player-events-header">
                            <h3>Score Distribution</h3>
                            <div className="filter-toggle">
                                <button
                                    className={`filter-button ${scoreFilter === "all" ? "filter-button-active" : ""}`}
                                    onClick={() => setScoreFilter("all")}
                                >
                                    All
                                </button>
                                <button
                                    className={`filter-button ${scoreFilter === "12" ? "filter-button-active" : ""}`}
                                    onClick={() => setScoreFilter("12")}
                                >
                                    12p
                                </button>
                                <button
                                    className={`filter-button ${scoreFilter === "24" ? "filter-button-active" : ""}`}
                                    onClick={() => setScoreFilter("24")}
                                >
                                    24p
                                </button>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={(() => {
                                    let filteredEvents = detailedInfo.mmrChanges || [];
                                    if (scoreFilter === "12") {
                                        filteredEvents = filteredEvents.filter((e) => e.numPlayers === 12);
                                    } else if (scoreFilter === "24") {
                                        filteredEvents = filteredEvents.filter((e) => e.numPlayers === 24);
                                    }
                                    const scores = filteredEvents.map((e) => e.score);
                                    const ranges = [
                                        { range: "0-20", min: 0, max: 20, count: 0 },
                                        { range: "21-40", min: 21, max: 40, count: 0 },
                                        { range: "41-60", min: 41, max: 60, count: 0 },
                                        { range: "61-80", min: 61, max: 80, count: 0 },
                                        { range: "81-100", min: 81, max: 100, count: 0 },
                                        { range: "101-120", min: 101, max: 120, count: 0 },
                                    ];
                                    scores.forEach((score) => {
                                        const range = ranges.find(
                                            (r) => score >= r.min && score <= r.max,
                                        );
                                        if (range) range.count++;
                                    });
                                    return ranges;
                                })()}
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="range"
                                    stroke="#9ca3af"
                                    label={{ value: "Score Range", position: "insideBottom", offset: -5 }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    label={{ value: "Events", angle: -90, position: "insideLeft" }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#0f172a",
                                        border: "1px solid #334155",
                                        borderRadius: "8px",
                                    }}
                                    labelStyle={{ color: "#e5e7eb" }}
                                />
                                <Legend />
                                <Bar dataKey="count" fill="#22c55e" name="Events" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="player-events-card">
                        <div className="player-events-header">
                            <h3>Recent Events</h3>
                            <div className="events-controls">
                                <div className="events-count">
                                    <span>Show</span>
                                    <input
                                        className="events-count-input"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={eventLimit}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            if (!Number.isNaN(value) && value >= 1 && value <= 100) {
                                                setEventLimit(value);
                                            }
                                        }}
                                    />
                                    <span>events</span>
                                </div>
                                <div className="filter-toggle">
                                    <button
                                        type="button"
                                        className={`filter-button ${
                                            eventFilter === "all" ? "filter-button-active" : ""
                                        }`}
                                        onClick={() => setEventFilter("all")}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-button ${
                                            eventFilter === "12" ? "filter-button-active" : ""
                                        }`}
                                        onClick={() => setEventFilter("12")}
                                    >
                                        12p
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-button ${
                                            eventFilter === "24" ? "filter-button-active" : ""
                                        }`}
                                        onClick={() => setEventFilter("24")}
                                    >
                                        24p
                                    </button>
                                </div>
                            </div>
                        </div>
                        {eventsToShow.length > 0 && (
                            <div className="recent-stats-row">
                                <div className="recent-stat">
                                    <span className="recent-stat-label">Avg score</span>
                                    <span className="recent-stat-value">
                                        {recentAvgScore != null
                                            ? recentAvgScore.toFixed(2)
                                            : "N/A"}
                                    </span>
                                </div>
                                <div className="recent-stat">
                                    <span className="recent-stat-label">Best score</span>
                                    <span className="recent-stat-value">
                                        {recentBestScore != null
                                            ? recentBestScore
                                            : "N/A"}
                                    </span>
                                </div>
                                <div className="recent-stat">
                                    <span className="recent-stat-label">Win rate</span>
                                    <span className="recent-stat-value">
                                        {recentWinRate != null
                                            ? `${(recentWinRate * 100).toFixed(1)}%`
                                            : "N/A"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {eventsToShow.length === 0 ? (
                        <p className="no-events-message">
                            No events match these filters yet.
                        </p>
                    ) : (
                        <div className="events-grid">
                            {eventsToShow.map((event, index) => (
                                <article className="event-card" key={index}>
                                    <div className="event-header">
                                        <p className="event-score">
                                            Scored{" "}
                                            <span
                                                className={
                                                    event.score > detailedInfo.averageScore
                                                        ? "above-average"
                                                        : "below-average"
                                                }
                                            >
                                                {event.score}
                                            </span>{" "}
                                            in a {event.numPlayers}p event
                                        </p>

                                        <p
                                            className={`event-delta ${
                                                event.mmrDelta > 0
                                                    ? "positive"
                                                    : "negative"
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
                    )}
                </div>
            )}
        </div>
    );
}

export default PlayerInfo;
