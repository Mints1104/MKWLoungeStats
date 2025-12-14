import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRankColor } from "./utils/playerUtils";

function Leaderboard() {
    const navigate = useNavigate();
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    
    // Filters
    const [minMmr, setMinMmr] = useState("");
    const [maxMmr, setMaxMmr] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("Mmr");

    const fetchLeaderboard = async () => {
        try {
            setError("");
            setLoading(true);

            const skip = (currentPage - 1) * pageSize;
            const params = new URLSearchParams({
                skip: skip.toString(),
                pageSize: pageSize.toString(),
                sortBy,
            });

            if (minMmr) params.append("minMmr", minMmr);
            if(maxMmr) params.append("maxMmr", maxMmr)
            if (searchQuery) params.append("search", searchQuery);

            const response = await fetch(`/api/leaderboard?${params}`);

            if (!response.ok) {
                throw new Error("Failed to fetch leaderboard");
            }

            const data = await response.json();
            setLeaderboardData(data.data || []);
            setTotalCount(data.totalCount || 0);
        } catch (err) {
            setError(err.message || "Failed to load leaderboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [currentPage, pageSize, sortBy]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchLeaderboard();
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const takeToProfile = (playerName) => {
        navigate(`/player/${encodeURIComponent(playerName)}`);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="player-info-page">
            <div className="player-card">
                <h1 className="player-title">Leaderboard</h1>
                <p className="player-subtitle">
                    Top players ranked by MMR, win rate, and performance.
                </p>

                {/* Filters */}
                <form onSubmit={handleSearch} className="leaderboard-filters">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label htmlFor="search">Search Player</label>
                            <input
                                id="search"
                                type="text"
                                className="player-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Player name..."
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="minMmr">Min MMR</label>
                            <input
                                id="minMmr"
                                type="number"
                                className="player-input"
                                value={minMmr}
                                onChange={(e) => setMinMmr(e.target.value)}
                                placeholder="e.g., 8000"
                            />
                        </div>

                         <div className="filter-group">
                            <label htmlFor="maxMmr">Max MMR</label>
                            <input
                                id="maxMmr"
                                type="number"
                                className="player-input"
                                value={maxMmr}
                                onChange={(e) => setMaxMmr(e.target.value)}
                                placeholder="e.g., 8000"
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="sortBy">Sort By</label>
                            <select
                                id="sortBy"
                                className="player-input"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="Mmr">MMR</option>
                                
                                <option value="EventsPlayed">Events Played</option>
                                <option value="MaxMmr">Max MMR</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="player-button">
                        Apply Filters
                    </button>
                </form>

                {error && <p className="player-error">{error}</p>}
                {loading && <p className="player-loading">Loading leaderboard...</p>}
            </div>

            {leaderboardData.length > 0 && (
                <div className="leaderboard-container">
                    <div className="leaderboard-table-wrapper">
                        <table className="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>MMR</th>
                                    <th>Max MMR</th>
                                    <th>Win Rate</th>
                                    <th>Events</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboardData.map((player) => (
                                    <tr key={player.id}>
                                        <td className="rank-cell">#{player.overallRank || "N/A"}</td>
                                        <td>
                                            <span className="leaderboard-name"
                                                style={{ 
                                                    color: getRankColor(player.mmrRank.name),
                                                    cursor: 'pointer',
                                    
                                                    
                                                }}
                                                onClick={() => takeToProfile(player.name)}
                                            >
                                                {player.name}
                                            </span>
                                        </td>
                                        <td className="mmr-cell">{player.mmr}</td>
                                        <td>{player.maxMmr}</td>
                                        <td
                                            className={
                                                player.winRate >= 0.5 ? "positive" : "negative"
                                            }
                                        >
                                            {(player.winRate * 100).toFixed(1)}%
                                        </td>
                                        <td>{player.eventsPlayed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="pagination-controls">
                        <div className="pagination-info">
                            Showing {(currentPage - 1) * pageSize + 1} -{" "}
                            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} players
                        </div>

                        <div className="pagination-buttons">
                            <button
                                className="pagination-btn"
                                onClick={goToPrevPage}
                                disabled={currentPage === 1}
                            >
                                ← Previous
                            </button>
                            <span className="pagination-page">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                            >
                                Next →
                            </button>
                        </div>

                        <div className="page-size-selector">
                            <label htmlFor="pageSize">Per page:</label>
                            <select
                                id="pageSize"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="page-size-select"
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;
