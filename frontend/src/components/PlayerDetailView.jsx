import { useMemo, useState } from "react";
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
import { getNextRank, getRankForMmrValue, getRankColor } from "../utils/playerUtils";
import { calculateEventStats } from "../utils/playerStats";
import { calculateMmrHistoryData, calculateScoreDistribution } from "../utils/chartUtils";
import FilterToggle from "./FilterToggle";
import StatCard from "./StatCard";
import EventCard from "./EventCard";

/**
 * Shared player detail view component used by both PlayerInfo and PlayerProfile pages
 * Displays player stats, MMR history chart, score distribution, and recent events
 */
function PlayerDetailView({ playerDetails, gradientIdPrefix = "mmrGradient" }) {
    const [eventFilter, setEventFilter] = useState("all");
    const [eventLimit, setEventLimit] = useState(10);
    const [eventInputValue, setEventInputValue] = useState("10");
    const [scoreFilter, setScoreFilter] = useState("all");

    // Derived stats for 12p / 24p events
    const {
        twelveCount,
        twentyFourCount,
        avg12,
        avg24,
        winRate12,
        winRate24,
    } = calculateEventStats(playerDetails?.mmrChanges);

    const { mmrHistoryData, gradientStops, gradientId } = useMemo(() => {
        return calculateMmrHistoryData(
            playerDetails?.mmrChanges,
            getRankForMmrValue,
            `${gradientIdPrefix}-${playerDetails?.playerId || 'default'}`
        );
    }, [playerDetails?.mmrChanges, playerDetails?.playerId, gradientIdPrefix]);

    // Events to display based on filter and limit
    let eventsToShow = [];
    if (playerDetails && Array.isArray(playerDetails.mmrChanges)) {
        let filtered = playerDetails.mmrChanges;
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
    let largestGain = null;
    let largestLoss = null;

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

        // Calculate largest gain and loss
        const deltas = eventsToShow.map(e => e.mmrDelta ?? 0);
        largestGain = Math.max(...deltas);
        largestLoss = Math.min(...deltas);
    }

    // Score distribution data computation
    const scoreDistributionData = useMemo(() => {
        return calculateScoreDistribution(playerDetails?.mmrChanges, scoreFilter);
    }, [playerDetails?.mmrChanges, scoreFilter]);

    // Find highest score and its table
    const highestScoreData = useMemo(() => {
        if (!playerDetails?.mmrChanges?.length) return null;
        
        const eventsWithScores = playerDetails.mmrChanges.filter(
            (e) => typeof e.score === "number" && !Number.isNaN(e.score)
        );
        
        if (!eventsWithScores.length) return null;
        
        const highestEvent = eventsWithScores.reduce((max, e) => 
            e.score > max.score ? e : max
        );
        
        return {
            score: highestEvent.score,
            changeId: highestEvent.changeId,
        };
    }, [playerDetails?.mmrChanges]);

    if (!playerDetails) return null;

    return (
        <div className="player-results">
            <div className="player-summary">
                <h2>
                    Stats for{" "}
                    <span style={{ color: getRankColor(playerDetails.rank) }}>
                        {playerDetails.name}
                    </span>
                </h2>
                <p>Player ID: {playerDetails.playerId}</p>
                <p>Overall Rank: #{playerDetails.overallRank}</p>
                <p>Current Rank: {playerDetails.rank}</p>
                <p>{getNextRank(playerDetails.mmr)}</p>
                <p>Current MMR: {playerDetails.mmr}</p>
                <p>Highest MMR: {playerDetails.maxMmr}</p>
                <p>
                    Highest Score:{" "}
                    {highestScoreData ? (
                        <a
                            href={`https://lounge.mkcentral.com/mkworld/TableDetails/${highestScoreData.changeId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#60a5fa", textDecoration: "underline" }}
                        >
                            {highestScoreData.score}
                        </a>
                    ) : "N/A"}
                </p>
                <p>
                    Average Score:{" "}
                    {playerDetails.averageScore != null
                        ? playerDetails.averageScore.toFixed(2)
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
                    Total Events Played: {playerDetails.eventsPlayed} (
                    {twelveCount} 12p / {twentyFourCount} 24p)
                </p>
                <p
                    className={`player-winrate ${
                        playerDetails.winRate >= 0.5 ? "positive" : "negative"
                    }`}
                >
                    Win Rate: {(playerDetails.winRate * 100).toFixed(2)}%
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
                        data={mmrHistoryData}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                {gradientStops.map((stop, idx) => (
                                    <stop
                                        key={idx}
                                        offset={stop.offset}
                                        stopColor={stop.color}
                                    />
                                ))}
                            </linearGradient>
                        </defs>
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
                        <Line
                            type="monotone"
                            dataKey="mmr"
                            stroke={`url(#${gradientId})`}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            strokeLinecap="round"
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
                        data={scoreDistributionData}
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
                                value={eventInputValue}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEventInputValue(value);
                                    
                                    // Only update the actual limit if valid
                                    const numValue = Number(value);
                                    if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                                        setEventLimit(numValue);
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value;
                                    // If empty or invalid on blur, reset to current limit
                                    if (value === '' || Number(value) < 1) {
                                        setEventInputValue(String(eventLimit));
                                    } else {
                                        const numValue = Math.min(Math.max(Number(value), 1), 100);
                                        setEventLimit(numValue);
                                        setEventInputValue(String(numValue));
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
                        <StatCard
                            label="MMR delta"
                            value={eventsToShow.length > 0 ? (() => {
                                const delta = eventsToShow.reduce((sum, event) => sum + (event.mmrDelta ?? 0), 0);
                                return delta > 0 ? `+${delta}` : delta;
                            })() : "N/A"}
                        />
                        <StatCard
                            label="Largest gain"
                            value={largestGain != null ? (largestGain > 0 ? `+${largestGain}` : largestGain) : "N/A"}
                        />
                        <StatCard
                            label="Largest loss"
                            value={largestLoss != null ? largestLoss : "N/A"}
                        />
                    </div>
                )}
            </div>

            {eventsToShow.length === 0 ? (
                <p className="no-events-message" aria-live="polite">
                    No events match these filters yet.
                </p>
            ) : (
                <div className="events-grid">
                    {eventsToShow.map((event) => (
                        <EventCard
                            key={event.changeId || `${event.time}-${event.newMmr}`}
                            event={event}
                            averageScore={playerDetails.averageScore}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default PlayerDetailView;
