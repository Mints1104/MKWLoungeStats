import { useCallback, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import FilterToggle from "./FilterToggle";
import { loungeApi } from "../api/loungeApi";
import { useAbortableRequest } from "../hooks/useAbortableRequest";
import { CURRENT_SEASON } from "../config/seasons";
import {
  buildSeasonComparison,
  buildSeasonOverlay,
  mergeDailyActivity,
} from "../utils/activityStats";

// Seasons 0 and 1 ran as a single undivided ladder ("mkworld"); season 2 onwards
// splits into mkworld12p / mkworld24p.
const FIRST_SPLIT_SEASON = 2;

const SCOPE_OPTIONS = [
  { value: "combined", label: "Combined" },
  { value: "12", label: "12p" },
  { value: "24", label: "24p" },
];

const BASIS_OPTIONS = [
  { value: "likeForLike", label: "Equal days" },
  { value: "fullSeason", label: "Full season" },
];

const SEASON_COLORS = [
  "#a78bfa",
  "#f59e0b",
  "#38bdf8",
  "#22c55e",
  "#f472b6",
  "#facc15",
];

function seasonLabel(season) {
  return season === 0 ? "Preseason" : `Season ${season}`;
}

function seasonColor(season) {
  return SEASON_COLORS[season % SEASON_COLORS.length];
}

/** ["Season 1", "Season 2", "Season 3"] -> "Season 1, Season 2 and Season 3" */
function listSeasons(labels) {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function formatCount(value) {
  if (!Number.isFinite(Number(value))) return "N/A";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatRate(value) {
  if (!Number.isFinite(Number(value))) return "N/A";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatSignedPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function deltaClassName(value) {
  if (value == null) return "stats-delta-flat";
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return "stats-delta-up";
  if (rounded < 0) return "stats-delta-down";
  return "stats-delta-flat";
}

function DeltaCell({ value, srSuffix }) {
  if (value == null) {
    return (
      <td className="stats-delta-flat">
        <span aria-hidden="true">N/A</span>
        <span className="sr-only">No previous season to compare against</span>
      </td>
    );
  }

  const rounded = Math.round(value * 10) / 10;
  const direction =
    rounded > 0 ? "up"
    : rounded < 0 ? "down"
    : "unchanged";

  return (
    <td className={deltaClassName(value)}>
      <span aria-hidden="true">{formatSignedPercent(value)}</span>
      <span className="sr-only">
        {`${Math.abs(rounded).toFixed(1)} percent ${direction}${srSuffix ? ` ${srSuffix}` : ""}`}
      </span>
    </td>
  );
}

/**
 * Pulls one season's stats. Pre-split seasons only ever have the single "mkworld"
 * ladder; for split seasons, "combined" re-adds 12p and 24p so they line up with the
 * pre-split numbers.
 */
async function fetchSeason(season, scope, signal) {
  const isSplit = season >= FIRST_SPLIT_SEASON;

  if (!isSplit) {
    const data = await loungeApi.getPlayerStats(
      { season, game: "mkworld" },
      signal,
    );
    return {
      season,
      label: seasonLabel(season),
      dailyActivity: data?.activityData?.dailyActivity ?? null,
      totalPlayers: Number(data?.totalPlayers) || null,
      averageMmr: Number(data?.averageMmr) || null,
      isCombinedLadder: true,
    };
  }

  if (scope === "combined") {
    const [twelve, twentyFour] = await Promise.all([
      loungeApi.getPlayerStats({ season, game: "mkworld12p" }, signal),
      loungeApi.getPlayerStats({ season, game: "mkworld24p" }, signal),
    ]);

    return {
      season,
      label: seasonLabel(season),
      dailyActivity: mergeDailyActivity([
        twelve?.activityData?.dailyActivity,
        twentyFour?.activityData?.dailyActivity,
      ]),
      // Player counts and average MMR are per-ladder and cannot be summed, so the
      // combined view omits them rather than printing a double-counted total.
      totalPlayers: null,
      averageMmr: null,
      isCombinedLadder: true,
    };
  }

  const data = await loungeApi.getPlayerStats(
    { season, game: `mkworld${scope}p` },
    signal,
  );
  return {
    season,
    label: seasonLabel(season),
    dailyActivity: data?.activityData?.dailyActivity ?? null,
    totalPlayers: Number(data?.totalPlayers) || null,
    averageMmr: Number(data?.averageMmr) || null,
    isCombinedLadder: false,
  };
}

function SeasonComparison({ isMobile = false }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("combined");
  const [basis, setBasis] = useState("likeForLike");
  const [seasons, setSeasons] = useState(null);
  const [missingSeasons, setMissingSeasons] = useState([]);
  const { loading, error, run } = useAbortableRequest();

  const seasonNumbers = useMemo(
    () => Array.from({ length: CURRENT_SEASON + 1 }, (_, index) => index),
    [],
  );

  // Fetching is driven by the two user actions that need it (opening the section and
  // switching ladder) rather than an effect, so the panel stays collapsed and silent
  // until it is actually asked for. Changing the basis is a pure recompute.
  const loadSeasons = useCallback(
    (nextScope) => {
      setSeasons(null);
      setMissingSeasons([]);

      run(
        async (signal) => {
          const settled = await Promise.allSettled(
            seasonNumbers.map((season) => fetchSeason(season, nextScope, signal)),
          );

          const rejected = settled.find(
            (result) => result.status === "rejected",
          );
          // A user-driven abort must not surface as an error banner.
          if (rejected?.reason?.name === "AbortError") {
            throw rejected.reason;
          }

          const loaded = settled
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
            .filter((entry) => entry.dailyActivity);

          if (loaded.length === 0) {
            throw new Error(
              rejected?.reason?.message || "No season data available",
            );
          }

          // Some seasons can fail on their own (the API is rate limited), and a table
          // quietly missing a season is worse than one that says so.
          const missing = seasonNumbers
            .filter((season) => !loaded.some((entry) => entry.season === season))
            .map(seasonLabel);

          return { loaded, missing };
        },
        { mapError: (err) => err.message || "Failed to load season comparison" },
      ).then((data) => {
        // `run` resolves to null when the request was aborted or failed; the hook has
        // already put the message on `error` in that case.
        if (data) {
          setSeasons(data.loaded);
          setMissingSeasons(data.missing);
        }
      });
    },
    [run, seasonNumbers],
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    loadSeasons(scope);
  }, [loadSeasons, scope]);

  const handleScopeChange = useCallback(
    (nextScope) => {
      if (nextScope === scope) return;
      setScope(nextScope);
      loadSeasons(nextScope);
    },
    [loadSeasons, scope],
  );

  const comparison = useMemo(
    () => buildSeasonComparison(seasons ?? [], { basis }),
    [seasons, basis],
  );

  const overlayData = useMemo(
    () =>
      buildSeasonOverlay(seasons ?? [], {
        limitDays: comparison.comparedDays ?? undefined,
      }),
    [seasons, comparison.comparedDays],
  );

  const showLadderColumns = scope !== "combined";

  const headline = useMemo(() => {
    const rows = comparison.rows;
    if (rows.length < 2) return null;

    const current = rows[rows.length - 1];
    const previous = rows[rows.length - 2];
    if (current.perDayChange == null) return null;

    const change = current.perDayChange;
    const magnitude = Math.abs(change).toFixed(1);
    const direction =
      change > 0 ? "more"
      : change < 0 ? "fewer"
      : "the same";

    const window =
      comparison.comparedDays != null ?
        `over the first ${comparison.comparedDays} days of each`
      : "over each full season";

    return {
      text:
        change === 0 ?
          `${current.label} is running the same number of mogis per day as ${previous.label}`
        : `${current.label} is running ${magnitude}% ${direction} mogis per day than ${previous.label}`,
      detail: `${formatRate(current.perDay)} vs ${formatRate(previous.perDay)} mogis/day, ${window}.`,
      className: deltaClassName(change),
    };
  }, [comparison]);

  const basisNote =
    comparison.comparedDays != null ?
      `Every season is counted over its first ${comparison.comparedDays} days, which is how long the shortest season here lasted. That way a season that is still being played is compared at the same point in its run as one that already finished.`
    : "Each season is counted over its own full length. A season that is still being played has had fewer days to add up events, and its most recent day is not finished yet.";

  return (
    <div className="player-card stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Season Comparison</h2>
        {open && (
          <div className="stats-card-controls">
            <div className="stats-control-group">
              <span className="stats-control-label" id="season-scope-label">
                Ladder
              </span>
              <FilterToggle
                activeFilter={scope}
                onFilterChange={handleScopeChange}
                options={SCOPE_OPTIONS}
                ariaLabelledBy="season-scope-label"
              />
            </div>
            <div className="stats-control-group">
              <span className="stats-control-label" id="season-basis-label">
                Compare
              </span>
              <FilterToggle
                activeFilter={basis}
                onFilterChange={setBasis}
                options={BASIS_OPTIONS}
                ariaLabelledBy="season-basis-label"
              />
            </div>
          </div>
        )}
      </div>

      {!open && (
        <>
          <p className="player-subtitle stats-comparison-intro">
            See how activity, player counts and MMR have moved from one season to
            the next.
          </p>
          <button
            type="button"
            className="show-all-events-btn"
            onClick={handleOpen}
          >
            Compare seasons
          </button>
        </>
      )}

      {open && error && (
        <p className="player-error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {open && loading && (
        <div
          className="loading-skeleton"
          aria-live="polite"
          aria-label="Loading season comparison"
        >
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      )}

      {open && !loading && comparison.rows.length > 0 && (
        <>
          {headline && (
            <div className="stats-headline" aria-live="polite">
              <p className={`stats-headline-text ${headline.className}`}>
                {headline.text}
              </p>
              <p className="stats-headline-detail">{headline.detail}</p>
            </div>
          )}

          {missingSeasons.length > 0 && (
            <p className="stats-missing-note" role="status">
              {`${listSeasons(missingSeasons)} could not be loaded just now, so ${missingSeasons.length === 1 ? "it is" : "they are"} left out below. Wait a moment and try again.`}
            </p>
          )}

          <p className="stats-basis-note">{basisNote}</p>

          <div className="stats-table-wrapper">
            <table className="leaderboard-table stats-table stats-season-table">
              <caption className="sr-only">
                {`Season-over-season comparison of total mogis, mogis per day${
                  showLadderColumns ? ", players and average MMR" : ""
                }, with the percentage change against the previous season.`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col">Days</th>
                  <th scope="col">Mogis</th>
                  <th scope="col">Mogis / Day</th>
                  <th scope="col">Δ Mogis / Day</th>
                  {showLadderColumns && <th scope="col">Players</th>}
                  {showLadderColumns && <th scope="col">Avg MMR</th>}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.season}>
                    <th scope="row" className="stats-season-cell">
                      <span
                        className="stats-season-swatch"
                        style={{ backgroundColor: seasonColor(row.season) }}
                        aria-hidden="true"
                      />
                      {row.label}
                      {row.season === CURRENT_SEASON && (
                        <span className="stats-season-tag">in progress</span>
                      )}
                      {showLadderColumns && row.isCombinedLadder && (
                        <span
                          className="stats-season-tag"
                          title="Before Season 2 there was only one ladder, so this season has no separate 12p and 24p numbers."
                        >
                          combined ladder
                        </span>
                      )}
                    </th>
                    <td>
                      {formatCount(row.days)}
                      {row.days !== row.seasonDays && (
                        <span className="stats-cell-note">
                          {` of ${formatCount(row.seasonDays)}`}
                        </span>
                      )}
                    </td>
                    <td>{formatCount(row.total)}</td>
                    <td>{formatRate(row.perDay)}</td>
                    <DeltaCell
                      value={row.perDayChange}
                      srSuffix={
                        row.previousLabel ? `versus ${row.previousLabel}` : ""
                      }
                    />
                    {showLadderColumns && (
                      <td>
                        {row.totalPlayers != null ?
                          formatCount(row.totalPlayers)
                        : "N/A"}
                      </td>
                    )}
                    {showLadderColumns && (
                      <td>
                        {row.averageMmr != null ?
                          formatCount(row.averageMmr)
                        : "N/A"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showLadderColumns && (
            <p className="stats-basis-note">
              A player can be on both the 12p and 24p ladders, so adding the two
              together would count them twice. Switch to 12p or 24p to see player
              counts and average MMR.
            </p>
          )}

          {overlayData.length > 0 && (
            <div className="stats-overlay-section">
              <h3 className="stats-section-title">
                Mogis per day, by week of season
              </h3>
              <div
                role="img"
                aria-label={`Line chart comparing mogis played per day across ${comparison.rows
                  .map((row) => row.label)
                  .join(", ")}, aligned so week one is each season's own opening week.`}
              >
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
                  <LineChart
                    data={overlayData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.4)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: isMobile ? 10 : 12, fill: "#e5e7eb" }}
                      axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                      tickLine={false}
                      interval={
                        overlayData.length > 12 ?
                          Math.floor(overlayData.length / 10)
                        : 0
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.6)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                      formatter={(value, name) => [
                        `${formatRate(value)} / day`,
                        name,
                      ]}
                      labelFormatter={(value) => `Week ${String(value).slice(1)}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "#e5e7eb" }}
                      iconType="plainline"
                    />
                    {comparison.rows.map((row) => (
                      <Line
                        key={row.season}
                        type="monotone"
                        dataKey={row.label}
                        stroke={seasonColor(row.season)}
                        strokeWidth={2}
                        // A one- or two-point series draws no visible line, which is
                        // what a season only days old looks like.
                        dot={overlayData.length <= 2 ? { r: 3 } : false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="stats-basis-note">
                Each point is the average mogis per day over that week of the
                season, so seasons that started at different times still line up.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SeasonComparison;
