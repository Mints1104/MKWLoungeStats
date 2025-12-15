import { useState, lazy, Suspense } from "react";
import { getRankColor, getNextRank } from "./utils/playerUtils";

// Lazy load chart components
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
import { loungeApi } from "./api/loungeApi";
import { calculateComparisonMmrData } from "./utils/chartUtils";
import PageHeader from "./components/PageHeader";
import StatCard from "./components/StatCard";

const PLAYER_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444"];
const PLAYER_LINE_STYLES = ["", "8 4", "3 3", "12 4 4 4"];

function PlayerComparison() {
    const [playerNames, setPlayerNames] = useState(["", ""]);
    const [playersData, setPlayersData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handlePlayerNameChange = (index, value) => {
        const newNames = [...playerNames];
        newNames[index] = value;
        setPlayerNames(newNames);
    };

    const addPlayerField = () => {
        if (playerNames.length < 4) {
            setPlayerNames([...playerNames, ""]);
        }
    };

    const removePlayerField = (index) => {
        if (playerNames.length > 2) {
            setPlayerNames(playerNames.filter((_, i) => i !== index));
        }
    };

    const comparePlayers = async () => {
        try {
            setError("");
            setPlayersData([]);

            const validNames = playerNames.filter((name) => name.trim());
            if (validNames.length < 2) {
                setError("Please enter at least 2 player names");
                return;
            }

            setLoading(true);
            const data = await loungeApi.comparePlayers(validNames);
            const validPlayers = data.filter((p) => !p.error);

            if (validPlayers.length < 2) {
                setError("Could not find enough valid players to compare");
                return;
            }

            setPlayersData(validPlayers);
        } catch (err) {
            setError(err.message || "Failed to compare players");
        } finally {
            setLoading(false);
        }
    };

    // Prepare MMR history data for overlaid chart
    const mmrHistoryData = calculateComparisonMmrData(playersData);

    const chartSummary = playersData.length >= 2
        ? (() => {
            const currentMmrLeader = playersData.reduce((best, player) =>
                (player.mmr ?? -Infinity) > (best.mmr ?? -Infinity) ? player : best
            );
            const bestWinRate = playersData.reduce((best, player) =>
                (player.winRate ?? -Infinity) > (best.winRate ?? -Infinity) ? player : best
            );
            const busiestPlayer = playersData.reduce((best, player) =>
                (player.eventsPlayed ?? -Infinity) > (best.eventsPlayed ?? -Infinity) ? player : best
            );

            const winRatePercent = ((bestWinRate.winRate ?? 0) * 100).toFixed(1);
            const totalEvents = busiestPlayer.eventsPlayed ?? 0;

            return `${currentMmrLeader.name} has the highest current MMR at ${currentMmrLeader.mmr}. ` +
                `${bestWinRate.name} leads win rate at ${winRatePercent}%. ` +
                `${busiestPlayer.name} has played the most lounge events (${totalEvents}).`;
        })()
        : "";

    return (
        <div className="player-info-page">
            <div className="player-card">
                <PageHeader 
                    title="Compare Players" 
                    subtitle="Compare up to 4 players side-by-side to see who performs better." 
                />

                <div className="comparison-inputs">
                    {playerNames.map((name, index) => (
                        <div key={index} className="comparison-input-row">
                            <label htmlFor={`player-${index}`} className="sr-only">
                                Player {index + 1} name
                            </label>
                            <input
                                id={`player-${index}`}
                                className="player-input"
                                value={name}
                                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                placeholder={`Player ${index + 1} name`}
                                aria-label={`Player ${index + 1} name input`}
                            />
                            {playerNames.length > 2 && (
                                <button
                                    className="remove-player-btn"
                                    onClick={() => removePlayerField(index)}
                                    aria-label={`Remove player ${index + 1}`}
                                    title="Remove player"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="comparison-actions">
                        {playerNames.length < 4 && (
                            <button 
                                className="add-player-btn" 
                                onClick={addPlayerField}
                                aria-label="Add another player to comparison"
                            >
                                + Add Player
                            </button>
                        )}
                        <button 
                            className="player-button" 
                            onClick={comparePlayers}
                            aria-label="Compare selected players"
                        >
                            Compare Players
                        </button>
                    </div>
                </div>

                {error && (
                    <p className="player-error" role="alert" aria-live="assertive">
                        {error}
                    </p>
                )}
                {loading && (
                    <div className="loading-skeleton" aria-live="polite" aria-label="Comparing players">
                        <div className="skeleton-row"></div>
                        <div className="skeleton-row"></div>
                        <div className="skeleton-row"></div>
                    </div>
                )}
            </div>

            {playersData.length >= 2 && (
                <>
                    {/* Side-by-side player stats */}
                    <div className="comparison-grid">
                        {playersData.map((player, index) => (
                            <div key={player.playerId} className="player-summary">
                                <h2>
                                    <span style={{ color: PLAYER_COLORS[index] }}>●</span>{" "}
                                    <span style={{ color: getRankColor(player.rank) }}>
                                        {player.name}
                                    </span>
                                </h2>
                                <p>Overall Rank: #{player.overallRank}</p>
                                <p>Current Rank: {player.rank}</p>
                                <p>{getNextRank(player.mmr)}</p>
                                <p>Current MMR: {player.mmr}</p>
                                <p>Highest MMR: {player.maxMmr}</p>
                                <p>
                                    Average Score:{" "}
                                    {player.averageScore != null
                                        ? player.averageScore.toFixed(2)
                                        : "N/A"}
                                </p>
                                <p>Events Played: {player.eventsPlayed}</p>
                                <p
                                    className={`player-winrate ${
                                        player.winRate >= 0.5 ? "positive" : "negative"
                                    }`}
                                >
                                    Win Rate: {(player.winRate * 100).toFixed(2)}%
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Head-to-head comparison */}
                    <div className="player-summary">
                        <h3>Head-to-Head Comparison</h3>
                        <div className="comparison-stats-grid">
                            <StatCard
                                label="Highest MMR"
                                value={
                                    playersData.reduce((max, p) =>
                                        p.mmr > max.mmr ? p : max
                                    ).name
                                }
                            />
                            <StatCard
                                label="Best Win Rate"
                                value={
                                    playersData.reduce((max, p) =>
                                        p.winRate > max.winRate ? p : max
                                    ).name
                                }
                            />
                            <StatCard
                                label="Best Avg Score"
                                value={
                                    playersData.reduce((max, p) =>
                                        (p.averageScore || 0) > (max.averageScore || 0) ? p : max
                                    ).name
                                }
                            />
                            <StatCard
                                label="Most Events"
                                value={
                                    playersData.reduce((max, p) =>
                                        p.eventsPlayed > max.eventsPlayed ? p : max
                                    ).name
                                }
                            />
                        </div>
                    </div>

                    {/* MMR History Comparison Chart */}
                    <div className="player-summary">
                        <h3>MMR History Comparison</h3>
                        <div
                            role="img"
                            aria-label="Line chart comparing player MMR changes over time with unique dash patterns for each player"
                        >
                            <Suspense fallback={<div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart...</div>}>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart
                                    data={mmrHistoryData}
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
                                    <Legend
                                        formatter={(value, entry, index) => (
                                            <span>
                                                <span aria-hidden="true" style={{
                                                    display: "inline-block",
                                                    width: 12,
                                                    height: 2,
                                                    marginRight: 6,
                                                    borderBottom: `2px ${PLAYER_LINE_STYLES[index % PLAYER_LINE_STYLES.length] ? "dashed" : "solid"} ${PLAYER_COLORS[index]}`,
                                                }} />
                                                {value}
                                            </span>
                                        )}
                                    />
                                    {playersData.map((player, index) => (
                                        <Line
                                            key={player.playerId}
                                            type="monotone"
                                            dataKey={player.name}
                                            stroke={PLAYER_COLORS[index]}
                                            strokeWidth={2.5}
                                            strokeDasharray={PLAYER_LINE_STYLES[index % PLAYER_LINE_STYLES.length]}
                                            strokeLinecap="round"
                                            dot={false}
                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                            </Suspense>
                        </div>
                        <p className="chart-summary" aria-live="polite">{chartSummary}</p>
                    </div>
                </>
            )}
        </div>
    );
}

export default PlayerComparison;
