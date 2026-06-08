import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Flag from "react-world-flags";
import {
  getNextRank,
  getRankForMmrValue,
  getRankColor,
  getEventFormat,
} from "../utils/playerUtils";
import { calculateEventStats } from "../utils/playerStats";
import {
  calculateMmrHistoryData,
  calculateScoreDistribution,
  MMR_CHART_Y_DOMAIN,
} from "../utils/chartUtils";
import FilterToggle from "./FilterToggle";
import StatCard from "./StatCard";
import EventCard from "./EventCard";
import Selector from "./Selector";

// Lazy load chart components
const LineChart = lazy(() =>
  import("recharts").then((m) => ({ default: m.LineChart })),
);
const BarChart = lazy(() =>
  import("recharts").then((m) => ({ default: m.BarChart })),
);
const Bar = lazy(() => import("recharts").then((m) => ({ default: m.Bar })));
const Line = lazy(() => import("recharts").then((m) => ({ default: m.Line })));
const XAxis = lazy(() =>
  import("recharts").then((m) => ({ default: m.XAxis })),
);
const YAxis = lazy(() =>
  import("recharts").then((m) => ({ default: m.YAxis })),
);
const CartesianGrid = lazy(() =>
  import("recharts").then((m) => ({ default: m.CartesianGrid })),
);
const Tooltip = lazy(() =>
  import("recharts").then((m) => ({ default: m.Tooltip })),
);
const Legend = lazy(() =>
  import("recharts").then((m) => ({ default: m.Legend })),
);
const ResponsiveContainer = lazy(() =>
  import("recharts").then((m) => ({ default: m.ResponsiveContainer })),
);

/**
 * Shared player detail view component used by both PlayerInfo and PlayerProfile pages
 * Displays player stats, MMR history chart, score distribution, and recent events
 */
const EVENT_LIMIT_STORAGE_KEY = "playerDetailEventLimitPref";
const GAME_MODE_FILTER_KEY = "playerGameModeFilterPref";
const TIER_FILTER_KEY = "playerTierFilterPref";

function getEventTier(event) {
  if (typeof event?.tier !== "string") return "";
  return event.tier.trim();
}

function DetailStatRow({ label, children, valueClassName = "" }) {
  return (
    <div className="player-detail-stat-row">
      <span className="recent-stat-label">{label}</span>
      <span className={`recent-stat-value ${valueClassName}`.trim()}>
        {children}
      </span>
    </div>
  );
}

function PlayerDetailView({
  playerDetails,
  season = 2,
  mmrType = 24,
  gradientIdPrefix = "mmrGradient",
}) {
  // Restore event limit preference from sessionStorage, default to number mode with 10
  const [eventLimitMode, setEventLimitMode] = useState(() => {
    try {
      const saved = sessionStorage.getItem(EVENT_LIMIT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.mode === "all" || parsed?.mode === "number") {
          return parsed.mode;
        }
      }
    } catch (e) {
      console.warn("Failed to load event limit mode from sessionStorage", e);
    }
    return "number";
  });

  const [eventLimitPreference, setEventLimitPreference] = useState(() => {
    try {
      const saved = sessionStorage.getItem(EVENT_LIMIT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const val = parseInt(parsed?.value, 10);
        if (!Number.isNaN(val) && val >= 1) {
          return val;
        }
      }
    } catch (e) {
      console.warn(
        "Failed to load event limit preference from sessionStorage",
        e,
      );
    }
    return 10;
  });

  const [eventLimit, setEventLimit] = useState(() =>
    Math.max(1, eventLimitPreference),
  );
  const [eventInputValue, setEventInputValue] = useState(() =>
    String(eventLimit),
  );
  const [eventFilter, setEventFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortMethod, setSortMethod] = useState("recent");
  // Set of game mode labels (e.g. "FFA", "2v2") that are currently hidden
  const [disabledModes, setDisabledModes] = useState(() => {
    try {
      const saved = sessionStorage.getItem(GAME_MODE_FILTER_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // ignore
    }
    return new Set();
  });
  // Set of tier labels (e.g. "A", "BC") that are currently hidden
  const [disabledTiers, setDisabledTiers] = useState(() => {
    try {
      const saved = sessionStorage.getItem(TIER_FILTER_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // ignore
    }
    return new Set();
  });
  const [gameModeOpen, setGameModeOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const gameModeMenuRef = useRef(null);
  const tierMenuRef = useRef(null);

  // Persist preference (mode + last chosen value) to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        EVENT_LIMIT_STORAGE_KEY,
        JSON.stringify({
          mode: eventLimitMode,
          value: eventLimitPreference,
        }),
      );
    } catch (e) {
      console.warn(
        "Failed to save event limit preference to sessionStorage",
        e,
      );
    }
  }, [eventLimitMode, eventLimitPreference]);

  // Persist disabled game modes to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        GAME_MODE_FILTER_KEY,
        JSON.stringify([...disabledModes]),
      );
    } catch {
      // ignore
    }
  }, [disabledModes]);

  // Persist disabled tiers to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        TIER_FILTER_KEY,
        JSON.stringify([...disabledTiers]),
      );
    } catch {
      // ignore
    }
  }, [disabledTiers]);

  // Close open dropdowns when clicking outside
  useEffect(() => {
    if (!gameModeOpen && !tierOpen) return;
    const handler = (e) => {
      const outsideMode =
        !gameModeMenuRef.current || !gameModeMenuRef.current.contains(e.target);
      const outsideTier =
        !tierMenuRef.current || !tierMenuRef.current.contains(e.target);

      if (outsideMode && outsideTier) {
        setGameModeOpen(false);
        setTierOpen(false);
      }

      if (
        gameModeMenuRef.current &&
        !gameModeMenuRef.current.contains(e.target)
      ) {
        setGameModeOpen(false);
      }

      if (tierMenuRef.current && !tierMenuRef.current.contains(e.target)) {
        setTierOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gameModeOpen, tierOpen]);

  // Create a unique set of events, prioritizing changeId to avoid duplicates
  // from API responses or state updates.
  const sanitizedEvents = useMemo(() => {
    if (!playerDetails || !Array.isArray(playerDetails.mmrChanges)) return [];

    const unique = new Map();
    // Traverse original array
    playerDetails.mmrChanges.forEach((e) => {
      // Create a unique key. Prefer changeId, fallback to composite key.
      const key =
        e.changeId ? `id-${e.changeId}` : `${e.time}-${e.newMmr}-${e.reason}`;

      // Only add if not already present
      if (!unique.has(key)) {
        // Store a shallow copy to prevent mutation
        unique.set(key, { ...e });
      }
    });

    // Return values, preserving original order
    return Array.from(unique.values());
  }, [playerDetails]);

  // Unique game modes played, derived from table events (e.g. ["FFA", "2v2", "3v3"])
  const availableGameModes = useMemo(() => {
    const modes = new Set();
    sanitizedEvents.forEach((e) => {
      if (e.reason !== "Table") return;
      const fmt = getEventFormat(e.numPlayers, e.numTeams);
      if (fmt) modes.add(fmt);
    });
    return Array.from(modes).sort();
  }, [sanitizedEvents]);

  const toggleMode = (mode) => {
    setDisabledModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  };

  const toggleTier = (tier) => {
    setDisabledTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  // Derived stats for 12p / 24p events
  const navigate = useNavigate();

  const { twelveCount, twentyFourCount, avg12, avg24, winRate12, winRate24 } =
    calculateEventStats(sanitizedEvents);

  const { mmrHistoryData, gradientStops, gradientId } = useMemo(() => {
    return calculateMmrHistoryData(
      sanitizedEvents,
      (val) => getRankForMmrValue(val, season, mmrType),
      `${gradientIdPrefix}-${playerDetails?.playerId || "default"}`,
    );
  }, [
    sanitizedEvents,
    playerDetails?.playerId,
    gradientIdPrefix,
    season,
    mmrType,
  ]);

  const baseFilteredEvents = useMemo(() => {
    if (!sanitizedEvents.length) return [];

    let filtered;
    // Only apply 12p/24p filters if season < 2
    if (season < 2) {
      if (eventFilter === "12") {
        filtered = sanitizedEvents.filter(
          (e) => e.reason === "Table" && e.numPlayers === 12,
        );
      } else if (eventFilter === "24") {
        filtered = sanitizedEvents.filter(
          (e) => e.reason === "Table" && e.numPlayers === 24,
        );
      } else {
        // For "all" filter, include everything (tables, penalties, deleted, etc.)
        filtered = sanitizedEvents;
      }
    } else {
      // For season >= 2, we don't filter by 12p/24p locally as the API returns specific game data
      filtered = sanitizedEvents;
    }

    // Apply game mode filter: hide table events whose format is in disabledModes.
    // Non-table events (penalties, bonuses, etc.) are always included.
    if (disabledModes.size > 0) {
      filtered = filtered.filter((e) => {
        if (e.reason !== "Table") return true;
        const fmt = getEventFormat(e.numPlayers, e.numTeams);
        return !disabledModes.has(fmt);
      });
    }

    return filtered;
  }, [sanitizedEvents, season, eventFilter, disabledModes]);

  // Unique tiers from currently visible recent-event candidates.
  // This is intentionally data-driven (no hardcoded tier list).
  const availableTiers = useMemo(() => {
    const tiers = [];
    const seen = new Set();

    baseFilteredEvents.forEach((e) => {
      if (e.reason !== "Table") return;
      const tier = getEventTier(e);
      if (!tier || seen.has(tier)) return;
      seen.add(tier);
      tiers.push(tier);
    });

    return tiers;
  }, [baseFilteredEvents]);

  // Events to display based on filter and limit
  let eventsToShow = [];
  let totalFilteredEvents = 0;
  if (baseFilteredEvents.length > 0) {
    let filtered = baseFilteredEvents;

    // Apply tier filter: hide table events whose tier is in disabledTiers.
    // Non-table events are always included.
    if (disabledTiers.size > 0) {
      filtered = filtered.filter((e) => {
        if (e.reason !== "Table") return true;
        const tier = getEventTier(e);
        return !tier || !disabledTiers.has(tier);
      });
    }

    totalFilteredEvents = filtered.length;

    // First limit to the most recent X events
    const recentEvents = filtered.slice(0, eventLimit);

    // Then sort those specific events based on selected method
    let sortedEvents = [...recentEvents];
    if (sortMethod === "gain") {
      sortedEvents.sort((a, b) => (b.mmrDelta || 0) - (a.mmrDelta || 0));
    } else if (sortMethod === "loss") {
      sortedEvents.sort((a, b) => (a.mmrDelta || 0) - (b.mmrDelta || 0));
    } else if (sortMethod === "score_asc") {
      sortedEvents.sort((a, b) => (a.score || 0) - (b.score || 0));
    } else if (sortMethod === "score_desc") {
      sortedEvents.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    // "recent" is default, preserve original order (which is by time/id)

    eventsToShow = sortedEvents; // No need to slice again
  }

  // Sync effective limit when player/filter changes, honoring "show all"
  useEffect(() => {
    if (!playerDetails) return;
    const total = totalFilteredEvents;

    if (eventLimitMode === "all") {
      const newLimit = Math.max(0, total);
      if (newLimit !== eventLimit) {
        setEventLimit(newLimit);
        setEventInputValue(String(newLimit));
      }
    } else {
      const desired = Math.max(1, eventLimitPreference);
      const newLimit = Math.max(1, Math.min(desired, total || desired));
      if (newLimit !== eventLimit) {
        setEventLimit(newLimit);
        setEventInputValue(String(newLimit));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    playerDetails,
    eventFilter,
    totalFilteredEvents,
    eventLimitMode,
    eventLimitPreference,
  ]);

  // Stats for the currently displayed events
  let recentAvgScore = null;
  let recentBestScore = null;
  let recentPartnerAvgScore = null;
  let recentWinRate = null;
  let largestGain = null;
  let largestLoss = null;
  let avgPlacementAll = null;
  let avgPlacement12 = null;
  let avgPlacement24 = null;

  if (eventsToShow.length) {
    // Only calculate score stats for table events (exclude penalties)
    const tableEvents = eventsToShow.filter((e) => e.reason === "Table");
    const tableEventsWithRank = tableEvents.filter((e) =>
      Number.isFinite(e.rank),
    );
    const withScores = tableEvents.filter(
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

    const partnerScores = tableEvents.flatMap((e) =>
      Array.isArray(e.partnerScores) ? e.partnerScores : [],
    );
    const partnerScoresNumeric = partnerScores.filter(
      (score) => typeof score === "number" && !Number.isNaN(score),
    );
    if (partnerScoresNumeric.length) {
      const sum = partnerScoresNumeric.reduce((acc, score) => acc + score, 0);
      recentPartnerAvgScore = sum / partnerScoresNumeric.length;
    }

    // Win rate only counts table events where MMR increased
    const tableWins = tableEvents.filter((e) => (e.mmrDelta ?? 0) > 0).length;
    recentWinRate =
      tableEvents.length > 0 ? tableWins / tableEvents.length : null;

    // Calculate largest gain and loss (include all events including penalties)
    const deltas = eventsToShow.map((e) => e.mmrDelta ?? 0);
    largestGain = Math.max(...deltas);
    largestLoss = Math.min(...deltas, 0);

    const getAveragePlacement = (items) => {
      if (!items.length) return null;
      const sum = items.reduce((acc, e) => acc + e.rank, 0);
      return sum / items.length;
    };

    avgPlacementAll = getAveragePlacement(tableEventsWithRank);
    avgPlacement12 = getAveragePlacement(
      tableEventsWithRank.filter((e) => e.numPlayers === 12),
    );
    avgPlacement24 = getAveragePlacement(
      tableEventsWithRank.filter((e) => e.numPlayers === 24),
    );
  }

  // Score distribution data computation
  const scoreDistributionData = useMemo(() => {
    // If season >= 2, ignore scoreFilter (effectively "all")
    const filterToUse = season >= 2 ? "all" : scoreFilter;
    return calculateScoreDistribution(sanitizedEvents, filterToUse);
  }, [sanitizedEvents, scoreFilter, season]);

  // Find highest score and its table (only from table events, not penalties)
  const highestScoreData = useMemo(() => {
    if (!sanitizedEvents.length) return null;

    // Only consider table events (exclude penalties)
    const tableEvents = sanitizedEvents.filter(
      (e) =>
        e.reason === "Table" &&
        typeof e.score === "number" &&
        !Number.isNaN(e.score),
    );

    if (!tableEvents.length) return null;

    const highestEvent = tableEvents.reduce((max, e) =>
      e.score > max.score ? e : max,
    );

    return {
      score: highestEvent.score,
      changeId: highestEvent.changeId,
    };
  }, [sanitizedEvents]);

  if (!playerDetails) return null;

  const nextRankText = getNextRank(playerDetails.mmr, season, mmrType);

  return (
    <div className="player-results">
      <div className="player-summary stats">
        <h2>
          <span>Stats for</span>
          {playerDetails.countryCode && (
            <Flag
              code={playerDetails.countryCode}
              className="flag-icon-medium"
              aria-label={`Flag of ${playerDetails.countryCode}`}
            />
          )}
          <span style={{ color: getRankColor(playerDetails.rank) }}>
            {playerDetails.name}
          </span>
        </h2>
        <DetailStatRow label="Player ID">{playerDetails.playerId}</DetailStatRow>
        <DetailStatRow label="Overall Rank">
          #{playerDetails.overallRank}
        </DetailStatRow>
        <DetailStatRow label="Current Rank">{playerDetails.rank}</DetailStatRow>
        {nextRankText && (
          <DetailStatRow label="Next Rank">{nextRankText}</DetailStatRow>
        )}
        <DetailStatRow label="Current MMR">{playerDetails.mmr}</DetailStatRow>
        <DetailStatRow label="Highest MMR">{playerDetails.maxMmr}</DetailStatRow>
        <DetailStatRow label="Highest Score">
          {highestScoreData && highestScoreData.changeId != null ?
            <button
              type="button"
              onClick={() => {
                const tableId = String(highestScoreData.changeId).trim();
                if (tableId && tableId !== "undefined" && tableId !== "null") {
                  navigate(`/table/${tableId}`);
                }
              }}
              className="event-link"
            >
              {highestScoreData.score}
            </button>
          : highestScoreData ?
            highestScoreData.score
          : "N/A"}
        </DetailStatRow>
        <DetailStatRow label="Average Score">
          {playerDetails.averageScore != null ?
            playerDetails.averageScore.toFixed(2)
          : "N/A"}
          {season < 2 && (
            <>
              {" "}
              ({avg12 != null ? `${avg12.toFixed(2)} 12p` : "N/A 12p"}
              {" / "}
              {avg24 != null ? `${avg24.toFixed(2)} 24p` : "N/A 24p"})
            </>
          )}
        </DetailStatRow>
        <DetailStatRow label="Partner Average Score">
          {playerDetails.partnerAverage != null ?
            playerDetails.partnerAverage.toFixed(2)
          : "N/A"}
        </DetailStatRow>
        <DetailStatRow label="Total Events Played">
          {playerDetails.eventsPlayed}
          {season < 2 && (
            <>
              {" "}
              ({twelveCount} 12p / {twentyFourCount} 24p)
            </>
          )}
        </DetailStatRow>
        <DetailStatRow
          label="Win Rate"
          valueClassName={`player-winrate ${
            playerDetails.winRate >= 0.5 ? "positive" : "negative"
          }`}
        >
          {(playerDetails.winRate * 100).toFixed(2)}%
          {season < 2 && (
            <>
              {" "}
              (
              {winRate12 != null ?
                `${(winRate12 * 100).toFixed(2)}% 12p`
              : "N/A 12p"}
              {" / "}
              {winRate24 != null ?
                `${(winRate24 * 100).toFixed(2)}% 24p`
              : "N/A 24p"}
              )
            </>
          )}
        </DetailStatRow>

      </div>

      {/* MMR History Chart */}
      <div className="player-summary mmr">
        <h3>MMR History</h3>
        <div
          className="mmr-chart-frame"
          role="img"
          aria-label="Line chart showing this player's MMR changes over time. Horizontal axis shows events, vertical axis shows MMR with colors indicating rank ranges."
        >
          <Suspense
            fallback={<div className="chart-loader">Loading chart...</div>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mmrHistoryData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
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
                  label={{
                    value: "Events",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  stroke="#9ca3af"
                  label={{ value: "MMR", angle: -90, position: "insideLeft" }}
                  domain={MMR_CHART_Y_DOMAIN}
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
          </Suspense>
        </div>

      </div>

      {/* Score Distribution Chart */}
      <div className="player-summary score">
        <div className="player-events-header">
          <h3>Score Distribution</h3>
          {season < 2 && (
            <FilterToggle
              activeFilter={scoreFilter}
              onFilterChange={setScoreFilter}
              options={[
                { value: "all", label: "All" },
                { value: "12", label: "12p" },
                { value: "24", label: "24p" },
              ]}
            />
          )}
        </div>
        <div
          role="img"
          aria-label="Bar chart showing how often different score ranges occur in this player's events. Horizontal axis shows score ranges, vertical axis shows event counts."
        >
          <Suspense
            fallback={<div className="chart-loader">Loading chart...</div>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={scoreDistributionData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="range"
                  stroke="#9ca3af"
                  interval={0}
                  tick={{ angle: -35, textAnchor: "end", dy: 4 }}
                  height={60}
                  label={{
                    value: "Score Range",
                    position: "insideBottom",
                    offset: 0,
                  }}
                />
                <YAxis
                  stroke="#9ca3af"
                  label={{
                    value: "Events",
                    angle: -90,
                    position: "insideLeft",
                  }}
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
          </Suspense>
        </div>

      </div>

      <div className="player-events-card">
        <h3>Recent Events</h3>
        <div className="events-controls">
            <Selector
              options={[
                { value: "recent", label: "Most Recent" },
                { value: "gain", label: "Biggest Gains" },
                { value: "loss", label: "Biggest Losses" },
                { value: "score_asc", label: "Scores (Asc)" },
                { value: "score_desc", label: "Scores (Desc)" },
              ]}
              value={sortMethod}
              onChange={setSortMethod}
              className="sort-selector"
              id="event-sort"
              label="Sort Events"
            />
            <div className="events-count">
              <span>Show</span>
              <input
                className="events-count-input"
                type="number"
                min={1}
                value={eventInputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setEventInputValue(value);

                  // Only update the actual limit if valid
                  const numValue = Number(value);
                  if (!Number.isNaN(numValue) && numValue >= 1) {
                    setEventLimitMode("number");
                    setEventLimitPreference(numValue);
                    setEventLimit(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  // If empty or invalid on blur, reset to current limit
                  if (value === "" || Number(value) < 1) {
                    setEventInputValue(String(eventLimit));
                  } else {
                    const numValue = Math.max(Number(value), 1);
                    setEventLimitMode("number");
                    setEventLimitPreference(numValue);
                    setEventLimit(numValue);
                    setEventInputValue(String(numValue));
                  }
                }}
              />
              <span>events</span>
              {totalFilteredEvents > eventLimit && (
                <button
                  type="button"
                  className="show-all-events-btn"
                  onClick={() => {
                    setEventLimitMode("all");
                    setEventLimitPreference(totalFilteredEvents);
                    setEventLimit(totalFilteredEvents);
                    setEventInputValue(String(totalFilteredEvents));
                  }}
                  aria-label={`Show all ${totalFilteredEvents} events`}
                >
                  Show All ({totalFilteredEvents})
                </button>
              )}
            </div>
            {season < 2 && (
              <FilterToggle
                activeFilter={eventFilter}
                onFilterChange={setEventFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "12", label: "12p" },
                  { value: "24", label: "24p" },
                ]}
              />
            )}
            {(availableGameModes.length > 1 ||
              availableGameModes.some((m) => disabledModes.has(m))) &&
              (() => {
                // Count how many of THIS player's modes are currently enabled.
                // Using raw disabledModes.size would break with stale cached modes from other players.
                const activeModeCount = availableGameModes.filter(
                  (m) => !disabledModes.has(m),
                ).length;
                const hasActiveFilter =
                  activeModeCount < availableGameModes.length;
                return (
                  <div className="game-mode-filter" ref={gameModeMenuRef}>
                    <button
                      type="button"
                      className={`game-mode-trigger${
                        hasActiveFilter ? " game-mode-trigger-active" : ""
                      }`}
                      onClick={() => setGameModeOpen((o) => !o)}
                      aria-expanded={gameModeOpen}
                      aria-controls="mode-filter-dropdown"
                      aria-label="Toggle mode filter"
                    >
                      Modes
                      {hasActiveFilter &&
                        ` (${activeModeCount}/${availableGameModes.length})`}{" "}
                      ▾
                    </button>
                    {gameModeOpen && (
                      <div
                        id="mode-filter-dropdown"
                        className="game-mode-dropdown"
                      >
                        {availableGameModes.map((mode) => (
                          <label
                            key={mode}
                            className="game-mode-checkbox-label"
                          >
                            <input
                              type="checkbox"
                              className="game-mode-checkbox"
                              checked={!disabledModes.has(mode)}
                              onChange={() => toggleMode(mode)}
                            />
                            {mode}
                          </label>
                        ))}
                        {hasActiveFilter && (
                          <button
                            type="button"
                            className="game-mode-reset"
                            onClick={() => setDisabledModes(new Set())}
                          >
                            Show all
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            {(availableTiers.length > 1 ||
              availableTiers.some((tier) => disabledTiers.has(tier))) &&
              (() => {
                const activeTierCount = availableTiers.filter(
                  (tier) => !disabledTiers.has(tier),
                ).length;
                const hasActiveTierFilter =
                  activeTierCount < availableTiers.length;

                return (
                  <div className="game-mode-filter" ref={tierMenuRef}>
                    <button
                      type="button"
                      className={`game-mode-trigger${
                        hasActiveTierFilter ? " game-mode-trigger-active" : ""
                      }`}
                      onClick={() => setTierOpen((o) => !o)}
                      aria-expanded={tierOpen}
                      aria-controls="tier-filter-dropdown"
                      aria-label="Toggle tier filter"
                    >
                      Tiers
                      {hasActiveTierFilter &&
                        ` (${activeTierCount}/${availableTiers.length})`}{" "}
                      ▾
                    </button>
                    {tierOpen && (
                      <div
                        id="tier-filter-dropdown"
                        className="game-mode-dropdown"
                      >
                        {availableTiers.map((tier) => (
                          <label
                            key={tier}
                            className="game-mode-checkbox-label"
                          >
                            <input
                              type="checkbox"
                              className="game-mode-checkbox"
                              checked={!disabledTiers.has(tier)}
                              onChange={() => toggleTier(tier)}
                            />
                            {tier}
                          </label>
                        ))}
                        {hasActiveTierFilter && (
                          <button
                            type="button"
                            className="game-mode-reset"
                            onClick={() => setDisabledTiers(new Set())}
                          >
                            Show all
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
        </div>
        {eventsToShow.length > 0 && (
          <div className="recent-stats-row">
            {season >= 2 && (
              <StatCard
                label="Avg placement"
                value={
                  avgPlacementAll != null ? avgPlacementAll.toFixed(2) : "N/A"
                }
              />
            )}
            {season < 2 && eventFilter === "all" && (
              <>
                <StatCard
                  label="Avg 12p placement"
                  value={
                    avgPlacement12 != null ? avgPlacement12.toFixed(2) : "N/A"
                  }
                />
                <StatCard
                  label="Avg 24p placement"
                  value={
                    avgPlacement24 != null ? avgPlacement24.toFixed(2) : "N/A"
                  }
                />
              </>
            )}
            {season < 2 && eventFilter === "12" && (
              <StatCard
                label="Avg placement (12p)"
                value={
                  avgPlacement12 != null ? avgPlacement12.toFixed(2) : "N/A"
                }
              />
            )}
            {season < 2 && eventFilter === "24" && (
              <StatCard
                label="Avg placement (24p)"
                value={
                  avgPlacement24 != null ? avgPlacement24.toFixed(2) : "N/A"
                }
              />
            )}
            <StatCard
              label="Avg score"
              value={recentAvgScore != null ? recentAvgScore.toFixed(2) : "N/A"}
            />
            <StatCard
              label="PAvg score"
              value={
                recentPartnerAvgScore != null ?
                  recentPartnerAvgScore.toFixed(2)
                : "N/A"
              }
            />
            <StatCard
              label="Best score"
              value={recentBestScore != null ? recentBestScore : "N/A"}
            />
            <StatCard
              label="Win rate"
              value={
                recentWinRate != null ?
                  `${(recentWinRate * 100).toFixed(1)}%`
                : "N/A"
              }
              valueClassName={recentWinRate >= 0.5 ? "positive" : "negative"}
            />
            <StatCard
              label="MMR delta"
              value={
                eventsToShow.length > 0 ?
                  (() => {
                    const delta = eventsToShow.reduce(
                      (sum, event) => sum + (event.mmrDelta ?? 0),
                      0,
                    );
                    return delta > 0 ? `+${delta}` : delta;
                  })()
                : "N/A"
              }
              valueClassName={
                (
                  eventsToShow.length > 0 &&
                  eventsToShow.reduce(
                    (sum, event) => sum + (event.mmrDelta ?? 0),
                    0,
                  ) > 0
                ) ?
                  "positive"
                : "negative"
              }
            />
            <StatCard
              label="Largest gain"
              value={
                largestGain != null ?
                  largestGain > 0 ?
                    `+${largestGain}`
                  : largestGain
                : "N/A"
              }
              valueClassName="positive"
            />
            <StatCard
              label="Largest loss"
              value={largestLoss != null ? largestLoss : "N/A"}
              valueClassName="negative"
            />
          </div>
        )}
      </div>

      {eventsToShow.length === 0 ?
        <p className="no-events-message" aria-live="polite">
          No events match these filters yet.
        </p>
      : <div className="events-grid">
          {eventsToShow.map((event) => (
            <EventCard
              key={event.changeId || `${event.time}-${event.newMmr}`}
              event={event}
              averageScore={playerDetails.averageScore}
              avg12={avg12}
              avg24={avg24}
            />
          ))}
        </div>
      }
    </div>
  );
}

export default PlayerDetailView;
