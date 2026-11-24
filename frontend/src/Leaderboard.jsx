import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Flag from "./components/CountryFlag";
import {
    useLocation,
    useNavigate,
    useNavigationType,
    useSearchParams,
} from "react-router-dom";
import { formatWinRate, getRankColor, winRateClassName } from "./utils/playerUtils";
import { COUNTRY_MAPPING } from "./utils/countryMapping";
import { loungeApi } from "./api/loungeApi";
import { debounce } from "./utils/debounce";
import {
    DEFAULT_PAGE_SIZE,
    cleanRangeFilters,
    parsePageParam,
    parsePageSizeParam,
} from "./utils/leaderboardParams";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";
import PlayerNameInput from "./components/PlayerNameInput";
import { useSettings } from "./context/settingsContext";
import { useSeasonMmrSelection } from "./hooks/useSeasonMmrSelection";
import { useAbortableRequest } from "./hooks/useAbortableRequest";
import { CURRENT_SEASON } from "./config/seasons";

function Leaderboard() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { defaultGameMode } = useSettings();

    const [leaderboardData, setLeaderboardData] = useState([]);


    const {
        season,
        setSeason,
        setSelectedMmrType,
        mmrType,
    } = useSeasonMmrSelection({
        initialSeason: () => {
            const param = searchParams.get("season");
            return param ? Number(param) : CURRENT_SEASON;
        },
        initialMmrType: () => {
            const param = searchParams.get("mmrType");
            return param ? Number(param) : null;
        },
        defaultMmrType: defaultGameMode,
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(() =>
        parsePageParam(searchParams.get("page"))
    );
    const [pageSize, setPageSize] = useState(() =>
        parsePageSizeParam(searchParams.get("pageSize"))
    );
    const [totalCount, setTotalCount] = useState(0);

    // Range filters: the inputs show what is typed, the request uses the cleaned
    // values once typing pauses (one request for "8000", not four)
    const [rangeInputs, setRangeInputs] = useState(() => cleanRangeFilters(searchParams));
    const [rangeFilters, setRangeFilters] = useState(() => cleanRangeFilters(searchParams));
    const { minMmr, maxMmr, minEventsPlayed, maxEventsPlayed } = rangeFilters;
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");
    const [country, setCountry] = useState(searchParams.get("country") || "");
    const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "mmr");
    const [filtersVisible, setFiltersVisible] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth >= 640 : true
    );

    // Sync URL params
    useEffect(() => {
        const params = new URLSearchParams();
        if (season !== CURRENT_SEASON) params.set("season", season);
        if (mmrType !== defaultGameMode) params.set("mmrType", mmrType);
        if (currentPage !== 1) params.set("page", currentPage);
        if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", pageSize);
        if (sortBy !== "mmr") params.set("sortBy", sortBy);
        if (minMmr) params.set("minMmr", minMmr);
        if (maxMmr) params.set("maxMmr", maxMmr);
        if (minEventsPlayed) params.set("minEventsPlayed", minEventsPlayed);
        if (maxEventsPlayed) params.set("maxEventsPlayed", maxEventsPlayed);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (country) params.set("country", country);

        const nextSearch = params.toString();
        if (nextSearch !== searchParams.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [season, mmrType, currentPage, pageSize, sortBy, minMmr, maxMmr, minEventsPlayed, maxEventsPlayed, debouncedSearch, country, defaultGameMode, setSearchParams, searchParams]);
    const { loading, error, run } = useAbortableRequest();

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

    const debouncedSetRange = useMemo(
        () => debounce((next) => {
            setRangeFilters(next);
            setCurrentPage(1);
        }, 400),
        []
    );

    const handleRangeChange = (key) => (e) => {
        const next = { ...rangeInputs, [key]: e.target.value };
        setRangeInputs(next);
        debouncedSetRange(cleanRangeFilters(next));
    };

    const fetchLeaderboard = useCallback(async () => {
        const data = await run(
            (signal) =>
                loungeApi.getLeaderboard(
                    {
                        page: currentPage,
                        pageSize,
                        sortBy,
                        minMmr,
                        maxMmr,
                        minEventsPlayed,
                        maxEventsPlayed,
                        search: debouncedSearch,
                        season,
                        mmrType,
                        country,
                    },
                    signal,
                ),
            {
                mapError: (err) => err.message || "Failed to load leaderboard",
            },
        );

        if (!data) {
            return;
        }

        setLeaderboardData(data.data || []);
        setTotalCount(data.totalCount || 0);
    }, [currentPage, pageSize, sortBy, minMmr, maxMmr, minEventsPlayed, maxEventsPlayed, debouncedSearch, season, mmrType, country, run]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchLeaderboard();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchLeaderboard]);

    const totalPages = Math.ceil(totalCount / pageSize);

    useEffect(() => {
        if (currentPage > 1 && totalPages > 0 && currentPage > totalPages) {
            const timer = setTimeout(() => {
                setCurrentPage(totalPages);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [currentPage, totalPages]);

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const takeToProfile = (playerName) => {
        navigate(`/player/${encodeURIComponent(playerName)}?season=${season}&mmrType=${mmrType}`);
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

    // Jump to page
    const [pageInput, setPageInput] = useState("");

    const jumpToPage = (e) => {
        e.preventDefault();
        const page = Number(pageInput);
        if (!Number.isInteger(page) || totalPages < 1) return;
        setCurrentPage(Math.min(Math.max(page, 1), totalPages));
        setPageInput("");
    };

    // Find player: overallRank is the player's position on the unfiltered,
    // MMR-sorted ladder, so clear the filters and open the page that holds it
    const [findName, setFindName] = useState("");
    const [highlightName, setHighlightName] = useState(null);
    const highlightRowRef = useRef(null);
    const {
        loading: finding,
        error: findError,
        run: runFind,
        setError: setFindError,
    } = useAbortableRequest();

    const findPlayer = async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const entry = await runFind(
            (signal) => loungeApi.getPlayerLeaderboardEntry(trimmed, season, mmrType, signal),
            {
                mapError: (err) =>
                    err.status === 404
                        ? `${trimmed} isn't on this ladder`
                        : err.message || "Failed to find player",
            },
        );
        if (!entry) return;
        // Players still in placement are listed but have no position yet
        if (!entry.overallRank) {
            setFindError(`${entry.name} is still in placement, so has no position yet`);
            return;
        }

        // A filter still waiting on its debounce would bring a cleared one back
        debouncedSetRange.cancel();
        debouncedSetSearch.cancel();
        const noRange = cleanRangeFilters({});
        setRangeInputs(noRange);
        setRangeFilters(noRange);
        setSearchQuery("");
        setDebouncedSearch("");
        setCountry("");
        setSortBy("mmr");
        // The total still describes the old (filtered) results; left in place, the
        // page clamp below would pull the new page back inside it
        setTotalCount(0);
        setCurrentPage(Math.ceil(entry.overallRank / pageSize));
        setHighlightName(entry.name);
    };

    const isHighlighted = (player) =>
        highlightName != null &&
        player.name.toLowerCase() === highlightName.toLowerCase();

    // Bring the found player's row into view once its page has loaded
    useEffect(() => {
        highlightRowRef.current?.scrollIntoView?.({ block: "center" });
        highlightRowRef.current?.focus({ preventScroll: true });
    }, [leaderboardData, highlightName]);

    return (
        <div className="player-info-page">
            <div className="player-card">
                <PageHeader
                    title="Leaderboard"
                    subtitle="Browse players by MMR, max MMR, events played, country and win rate. Use filters to narrow down specific ranges or search by name."
                >
                </PageHeader>

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
                                value={rangeInputs.minMmr}
                                onChange={handleRangeChange("minMmr")}
                                placeholder="e.g., 8000"
                            />
                        </div>



                        <div className="filter-group">
                            <label htmlFor="maxMmr">Max MMR</label>
                            <input
                                id="maxMmr"
                                type="number"
                                className="player-input"
                                value={rangeInputs.maxMmr}
                                onChange={handleRangeChange("maxMmr")}
                                placeholder="e.g., 8000"
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="country">Country</label>
                            <select
                                id="country"
                                className="player-input"
                                value={country}
                                onChange={(e) => {
                                    setCountry(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                {COUNTRY_MAPPING.map((c) => (
                                    <option key={c.code || "all"} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="sortBy">Sort By</label>
                            <select
                                id="sortBy"
                                className="player-input"
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="mmr">MMR</option>
                                <option value="eventsPlayed">Events Played</option>
                                <option value="maxMmr">Peak MMR</option>
                                <option value="lastWeekRankChange">Last Week</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="minEvents">Min Events</label>
                            <input
                                id="minEvents"
                                type="number"
                                className="player-input"
                                placeholder="e.g., 10"
                                value={rangeInputs.minEventsPlayed}
                                onChange={handleRangeChange("minEventsPlayed")}
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="maxEvents">Max Events</label>
                            <input
                                id="maxEvents"
                                type="number"
                                className="player-input"
                                placeholder="e.g., 10"
                                value={rangeInputs.maxEventsPlayed}
                                onChange={handleRangeChange("maxEventsPlayed")}
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="season-select-filter">Season</label>
                            <SeasonSelector
                                selectedSeason={season}
                                onSeasonChange={(value) => {
                                    setSeason(value);
                                    setCurrentPage(1);
                                }}
                                id="season-select-filter"
                            />
                        </div>

                        {season >= 2 && (
                            <div className="filter-group">
                                <label htmlFor="mmr-select-filter">MMR Type</label>
                                <MMRSelector
                                    selectedMMR={mmrType}
                                    onMMRChange={(value) => {
                                        setSelectedMmrType(value);
                                        setCurrentPage(1);
                                    }}
                                    id="mmr-select-filter"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <form
                    className="find-player-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        findPlayer(findName);
                    }}
                >
                    <label htmlFor="find-player">Find a player's position</label>
                    <div className="find-player-row">
                        <PlayerNameInput
                            id="find-player"
                            value={findName}
                            onChange={setFindName}
                            onSelect={findPlayer}
                            season={season}
                            mmrType={mmrType}
                            ariaLabel="Find a player's position"
                        />
                        <button
                            type="submit"
                            className="pagination-btn"
                            disabled={!findName.trim() || finding}
                        >
                            {finding ? "Finding…" : "Find"}
                        </button>
                    </div>
                    {findError && (
                        <p className="player-error" role="alert">
                            {findError}
                        </p>
                    )}
                </form>

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
                        <table className="leaderboard-table fits-mobile row-link-table">
                            <caption className="sr-only">
                                Current leaderboard standings with ranks, MMR, win rate, and events played. Use the player name buttons to open detailed profiles.
                            </caption>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>MMR</th>
                                    <th>Peak MMR</th>
                                    <th className="col-optional">Last Week</th>
                                    <th className="col-optional">Win Rate</th>
                                    <th>Events</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboardData.map((player) => (
                                    <tr
                                        key={player.id}
                                        tabIndex={0}
                                        onKeyDown={(e) => handleRowKeyPress(e, player.name)}
                                        ref={isHighlighted(player) ? highlightRowRef : undefined}
                                        className={isHighlighted(player) ? "leaderboard-row-highlight" : undefined}
                                        aria-current={isHighlighted(player) ? "true" : undefined}
                                    >
                                        <td className="rank-cell">{player.overallRank || "N/A"}</td>
                                        <td className="player-name-cell">
                                            <div className="player-name-container">
                                                {player.countryCode && (
                                                    <Flag
                                                        code={player.countryCode}
                                                        className="flag-icon-small"
                                                        aria-label={`Flag of ${player.countryCode}`}
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    className="leaderboard-name"
                                                    onClick={() => takeToProfile(player.name)}
                                                    aria-label={`View profile for ${player.name}`}
                                                >
                                                    {player.name}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="mmr-cell" style={{ color: getRankColor(player.mmrRank?.name) }}>{player.mmr}</td>
                                        <td style={{ color: getRankColor(player.maxMmrRank?.name) }}>{player.maxMmr}</td>
                                        <td className={`col-optional ${player.lastWeekRankChange < 0 ? "positive" : player.lastWeekRankChange > 0 ? "negative" : ""}`}>
                                            {player.lastWeekRankChange < 0 ? "▲ " : player.lastWeekRankChange > 0 ? "▼ " : ""}
                                            {player.lastWeekRankChange !== 0 && player.lastWeekRankChange != null ? Math.abs(player.lastWeekRankChange) : "—"}
                                        </td>
                                        <td className={`col-optional ${winRateClassName(player.winRate)}`}>
                                            {formatWinRate(player.winRate, 1)}
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

                        <form className="page-size-selector" onSubmit={jumpToPage}>
                            <label htmlFor="jumpToPage">Go to page:</label>
                            <input
                                id="jumpToPage"
                                type="number"
                                min={1}
                                max={totalPages}
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                className="page-size-select jump-to-page-input"
                                placeholder={String(currentPage)}
                            />
                            <button type="submit" className="pagination-btn">
                                Go
                            </button>
                        </form>

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

// Leaderboard reads its filters from the URL once, on mount, and then mirrors them
// back with REPLACE navigations. Any other navigation that lands here (the nav link,
// back/forward between leaderboard entries) remounts it so it re-reads the new URL
// instead of writing its old filters back over it.
function LeaderboardRoute() {
    const location = useLocation();
    const navigationType = useNavigationType();
    const [mountKey, setMountKey] = useState(location.key);

    if (navigationType !== "REPLACE" && location.key !== mountKey) {
        setMountKey(location.key);
    }

    return <Leaderboard key={mountKey} />;
}

export default LeaderboardRoute;
