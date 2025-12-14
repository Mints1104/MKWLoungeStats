import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { formatTimeAgo, getNextRank, getRankColor } from "./utils/playerUtils";
import FilterToggle from "./components/FilterToggle";
import StatCard from "./components/StatCard";
import EventCard from "./components/EventCard";

function PlayerProfile() {
    const { playerName } = useParams();
    const navigate = useNavigate();
    const [detailedInfo, setDetailedInfo] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [eventFilter, setEventFilter] = useState("all");
    const [eventLimit, setEventLimit] = useState(10);
    const [scoreFilter, setScoreFilter] = useState("all");

    useEffect(() => {
        const getPlayerInfo = async () => {
            try {
                setError("");
                setDetailedInfo(null);

                if (!playerName) {
                    setError("No player name provided");
                    return;
                }

                setLoading(true);
                
                // Fetch player details
                const response = await fetch(
                    `/api/player/details/${encodeURIComponent(playerName)}?season=1`,
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

        getPlayerInfo();
    }, [playerName]);

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
                <button 
                    className="player-button" 
                    onClick={() => navigate(-1)}
                    style={{ marginBottom: '1rem', width: 'auto' }}
                >
                    ← Back
                </button>
                <h1 className="player-title">Player Profile</h1>
                <p className="player-subtitle">
                    Viewing stats for {detailedInfo?.name || playerName}
                </p>

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
                        <p>Overall Rank: #{detailedInfo.overallRank}</p>
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
                            <FilterToggle
                                activeFilter={scoreFilter}
                                onFilterChange={setScoreFilter}
                                options={[
                                    { value: "all", label: "All" },
                                    { value: "12", label: "12p" },
                                    { value: "24", label: "24p" },
                                ]}
                            />
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
                                <FilterToggle
                                    activeFilter={eventFilter}
                                    onFilterChange={setEventFilter}
                                    options={[
                                        { value: "all", label: "All" },
                                        { value: "12", label: "12p" },
                                        { value: "24", label: "24p" },
                                    ]}
                                />
                            </div>
                        </div>
                        {eventsToShow.length > 0 && (
                            <div className="recent-stats-row">
                                <StatCard
                                    label="Avg score"
                                    value={recentAvgScore != null ? recentAvgScore.toFixed(2) : "N/A"}
                                />
                                <StatCard
                                    label="Best score"
                                    value={recentBestScore != null ? recentBestScore : "N/A"}
                                />
                                <StatCard
                                    label="Win rate"
                                    value={recentWinRate != null ? `${(recentWinRate * 100).toFixed(1)}%` : "N/A"}
                                />
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
                                <EventCard
                                    key={index}
                                    event={event}
                                    averageScore={detailedInfo.averageScore}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default PlayerProfile;
