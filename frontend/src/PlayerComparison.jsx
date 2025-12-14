import { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { getRankColor, getNextRank } from "./utils/playerUtils";
import StatCard from "./components/StatCard";

const PLAYER_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444"];

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
            const namesParam = validNames.join(",");
            const response = await fetch(`/api/players/compare?names=${encodeURIComponent(namesParam)}`);

            if (!response.ok) {
                throw new Error("Failed to fetch comparison data");
            }

            const data = await response.json();
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
    const getMmrHistoryData = () => {
        if (playersData.length === 0) return [];

        const maxEvents = Math.max(...playersData.map((p) => p.mmrChanges?.length || 0));
        const data = [];

        for (let i = 0; i < maxEvents; i++) {
            const point = { event: i + 1 };
            playersData.forEach((player, pIndex) => {
                const events = player.mmrChanges?.slice().reverse() || [];
                if (events[i]) {
                    point[player.name] = events[i].newMmr;
                }
            });
            data.push(point);
        }

        return data;
    };

    const mmrHistoryData = getMmrHistoryData();

    return (
        <div className="player-info-page">
            <div className="player-card">
                <h1 className="player-title">Compare Players</h1>
                <p className="player-subtitle">
                    Compare up to 4 players side-by-side to see who performs better.
                </p>

                <div className="comparison-inputs">
                    {playerNames.map((name, index) => (
                        <div key={index} className="comparison-input-row">
                            <input
                                className="player-input"
                                value={name}
                                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                placeholder={`Player ${index + 1} name`}
                            />
                            {playerNames.length > 2 && (
                                <button
                                    className="remove-player-btn"
                                    onClick={() => removePlayerField(index)}
                                    title="Remove player"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="comparison-actions">
                        {playerNames.length < 4 && (
                            <button className="add-player-btn" onClick={addPlayerField}>
                                + Add Player
                            </button>
                        )}
                        <button className="player-button" onClick={comparePlayers}>
                            Compare Players
                        </button>
                    </div>
                </div>

                {error && <p className="player-error">{error}</p>}
                {loading && <p className="player-loading">Loading comparison...</p>}
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
                                    domain={["dataMin - 100", "dataMax + 100"]}
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
                                {playersData.map((player, index) => (
                                    <Line
                                        key={player.playerId}
                                        type="monotone"
                                        dataKey={player.name}
                                        stroke={PLAYER_COLORS[index]}
                                        strokeWidth={2}
                                        dot={{ fill: PLAYER_COLORS[index], r: 2 }}
                                        activeDot={{ r: 4 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}

export default PlayerComparison;
