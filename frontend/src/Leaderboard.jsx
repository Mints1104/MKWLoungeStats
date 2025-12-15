import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getRankColor } from "./utils/playerUtils";
import { loungeApi } from "./api/loungeApi";
import { debounce } from "./utils/debounce";
import PageHeader from "./components/PageHeader";

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
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState("mmr");
    const [filtersVisible, setFiltersVisible] = useState(true);
    const requestRef = useRef(null);

    // Debounced search handler
    const debouncedSetSearch = useMemo(
        () => debounce((value) => {
            setDebouncedSearch(value);
            setCurrentPage(1);
        }, 300),
        []
    );

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSetSearch(value);
    };

    const fetchLeaderboard = useCallback(async () => {
        try {
            setError("");
            setLoading(true);

            if (requestRef.current) {
                requestRef.current.abort();
            }

            const controller = new AbortController();
            requestRef.current = controller;

            const data = await loungeApi.getLeaderboard(
                {
                    page: currentPage,
                    pageSize,
                    sortBy,
                    minMmr,
                    maxMmr,
                    search: debouncedSearch
                },
                controller.signal
            );

            setLeaderboardData(data.data || []);
            setTotalCount(data.totalCount || 0);
            requestRef.current = null;
        } catch (err) {
            if (err.name === "AbortError") {
                return;
            }
            setError(err.message || "Failed to load leaderboard");
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, sortBy, minMmr, maxMmr, debouncedSearch]);

    useEffect(() => {
        fetchLeaderboard();
        return () => {
            if (requestRef.current) {
                requestRef.current.abort();
                requestRef.current = null;
            }
        };
    }, [fetchLeaderboard]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const takeToProfile = (playerName) => {
        navigate(`/player/${encodeURIComponent(playerName)}`);
    };

    const handleRowKeyPress = (e, playerName) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            takeToProfile(playerName);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="player-info-page">
            <div className="player-card">
                <PageHeader 
                    title="Leaderboard" 
                    subtitle="Top players ranked by current MMR, max MMR, and events played." 
                />

                {/* Filter Toggle Button (Mobile) */}
                <button 
                    className="filter-toggle-btn"
                    onClick={() => setFiltersVisible(!filtersVisible)}
                    aria-expanded={filtersVisible}
                    aria-controls="leaderboard-filters"
                >
                    {filtersVisible ? '▲ Hide Filters' : '▼ Show Filters'}
                </button>

                {/* Filters */}
                <div 
                    id="leaderboard-filters"
                    className={`leaderboard-filters ${filtersVisible ? 'filters-visible' : 'filters-hidden'}`}
                >
                    <div className="filter-row">
                        <div className="filter-group">
                            <label htmlFor="search">Search Player</label>
                            <input
                                id="search"
                                type="text"
                                className="player-input"
                                value={searchQuery}
                                onChange={handleSearchChange}
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
                                <option value="mmr">MMR</option>
                                <option value="eventsPlayed">Events Played</option>
                                <option value="maxMmr">Max MMR</option>
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <p className="player-error" role="alert" aria-live="assertive">
                        {error}
                    </p>
                )}
                {loading && (
                    <div className="loading-skeleton" aria-live="polite" aria-label="Loading leaderboard">
                        <div className="skeleton-row"></div>
                        <div className="skeleton-row"></div>
                        <div className="skeleton-row"></div>
                        <div className="skeleton-row"></div>
                        <div className="skeleton-row"></div>
                    </div>
                )}
            </div>

            {leaderboardData.length > 0 && (
                <div className="player-card leaderboard-card">
                    <div className="leaderboard-table-wrapper">
                        <table className="leaderboard-table">
                            <caption className="sr-only">
                                Current leaderboard standings with ranks, MMR, win rate, and events played. Use the player name buttons to open detailed profiles.
                            </caption>
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
                                            <button
                                                type="button"
                                                className="leaderboard-name"
                                                onClick={() => takeToProfile(player.name)}
                                                aria-label={`View profile for ${player.name}`}
                                            >
                                                {player.name}
                                            </button>
                                        </td>
                                        <td className="mmr-cell" style={{color: getRankColor(player.mmrRank.name)}}>{player.mmr}</td>
                                        <td style={{color: getRankColor(player.maxMmrRank.name)}}>{player.maxMmr}</td>
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

            {!loading && !error && leaderboardData.length === 0 && (
                <div className="player-card leaderboard-card">
                    <p className="player-subtitle" aria-live="polite">
                        No players match the current filters. Try adjusting your search terms or MMR range.
                    </p>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;
