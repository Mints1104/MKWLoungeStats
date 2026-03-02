import { useEffect, useRef, useState, useMemo } from "react";
import { loungeApi } from "./api/loungeApi";
import PageHeader from "./components/PageHeader";
import StatCard from "./components/StatCard";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";
import { getRankColor } from "./utils/playerUtils";
import Flag from "react-world-flags";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatDateShort(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [season, setSeason] = useState(2);
  const [mmrType, setMmrType] = useState(24);
  const requestRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;

    async function fetchStats() {
      try {
        setLoading(true);
        setError("");
        setStats(null);

        const game = season >= 2 ? `mkworld${mmrType}p` : "mkworld";
        const data = await loungeApi.getPlayerStats(
          { season, game },
          controller.signal,
        );
        setStats(data || null);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setError(err.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    return () => {
      controller.abort();
      requestRef.current = null;
    };
  }, [season, mmrType]);

  useEffect(() => {
    function handleResize() {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 640);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const divisionTable = useMemo(() => {
    if (!stats?.divisionData || !Array.isArray(stats.divisionData)) {
      return [];
    }

    const totalPlayers = stats.totalPlayers || 0;
    if (!totalPlayers) return [];

    const order = Array.isArray(stats.divisionsToTier?.Q)
      ? [...stats.divisionsToTier.Q]
      : undefined;

    const byTier = new Map(
      stats.divisionData.map((d) => [d.tier, d.count ?? 0]),
    );

    const orderedTiers =
      Array.isArray(order) ?
        order.filter((tier) => byTier.has(tier) && tier !== "Placement")
      : stats.divisionData
          .map((d) => d.tier)
          .filter((tier) => tier && tier !== "Placement");

    const rows = orderedTiers.map((tier) => ({
      tier,
      count: byTier.get(tier) ?? 0,
    }));

    // Compute percent of players and percentile (top X%) from highest tier down
    const fromTop = [...rows].reverse();
    let cumulativeAboveOrEqual = 0;
    const percentileMap = new Map();

    fromTop.forEach((row) => {
      cumulativeAboveOrEqual += row.count;
      const topPercent = (cumulativeAboveOrEqual / totalPlayers) * 100;
      percentileMap.set(row.tier, topPercent);
    });

    return rows.map((row) => {
      const percentOfPlayers = (row.count / totalPlayers) * 100;
      const topPercent = percentileMap.get(row.tier) ?? null;

      return {
        ...row,
        percentOfPlayers,
        percentile: topPercent,
        color: getRankColor(row.tier),
      };
    });
  }, [stats]);

  const chartData = useMemo(
    () =>
      divisionTable.map((row) => ({
        tier: row.tier,
        count: row.count,
        color: row.color,
      })),
    [divisionTable],
  );

  const formatEntries = useMemo(() => {
    const formats = stats?.activityData?.formatData || {};
    return Object.entries(formats)
      .map(([format, count]) => ({
        format,
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats]);

  const tierEntries = useMemo(() => {
    const tiers = stats?.activityData?.tierActivity || {};
    return Object.entries(tiers)
      .map(([tier, count]) => ({
        tier,
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats]);

  const dayOfWeekData = useMemo(() => {
    const order = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayData = stats?.activityData?.dayOfWeekActivity || {};
    return order
      .filter((day) => day in dayData)
      .map((day) => ({
        day,
        count: Number(dayData[day]) || 0,
      }));
  }, [stats]);

  const dailyActivityData = useMemo(() => {
    const daily = stats?.activityData?.dailyActivity || {};
    return Object.entries(daily)
      .map(([date, values]) => {
        const total = values?.Total;
        const fallbackTotal =
          values ?
            Object.values(values).reduce(
              (sum, value) => sum + (Number(value) || 0),
              0,
            )
          : 0;
        return {
          date,
          total: Number.isFinite(total) ? Number(total) : fallbackTotal,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [stats]);

  const countryRows = useMemo(() => {
    const countryData = stats?.countryData || {};
    return Object.entries(countryData)
      .map(([code, data]) => {
        const topPlayers =
          Array.isArray(data?.topSixPlayers) ?
            data.topSixPlayers.slice(0, 3).map((p) => p.name)
          : [];
        return {
          code,
          playerTotal: Number(data?.playerTotal) || 0,
          averageMmr: Number(data?.totalAverageMmr) || null,
          topSixMmr: Number(data?.topSixMmr) || null,
          topPlayers,
        };
      })
      .sort((a, b) => b.playerTotal - a.playerTotal)
      .slice(0, 10);
  }, [stats]);

  const rankThresholds = useMemo(() => {
    const ranks = stats?.ranks || {};
    return Object.entries(ranks)
      .map(([rank, value]) => ({ rank, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  return (
    <div className="player-info-page">
      <div className="player-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <PageHeader
            title="Lounge Overview"
            subtitle="Global player statistics for Mario Kart World Lounge."
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <SeasonSelector
              selectedSeason={season}
              onSeasonChange={setSeason}
            />
            {season >= 2 && (
              <MMRSelector selectedMMR={mmrType} onMMRChange={setMmrType} />
            )}
          </div>
        </div>

        {error && (
          <p className="player-error" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {loading && (
          <div
            className="loading-skeleton"
            aria-live="polite"
            aria-label="Loading lounge stats"
          >
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        )}

        {stats && (
          <div className="recent-stats-row stats-summary-grid">
            <StatCard
              label="Total Players"
              value={formatNumber(stats.totalPlayers)}
            />
            <StatCard
              label="Total Mogis"
              value={formatNumber(stats.totalMogis)}
            />
            <StatCard label="Average MMR" value={formatNumber(stats.averageMmr)} />
            <StatCard label="Median MMR" value={formatNumber(stats.medianMmr)} />
          </div>
        )}
      </div>

      {stats && (
        <div className="player-card stats-card">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
            Players per Rank
          </h2>
          <div className="stats-layout">
            <div className="stats-chart">
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 260}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -10,
                    bottom: isMobile ? 40 : 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.4)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="tier"
                    tick={{
                      fontSize: isMobile ? 10 : 12,
                      fill: "#e5e7eb",
                    }}
                    axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                    tickLine={false}
                    interval={0}
                    tickMargin={isMobile ? 10 : 4}
                    angle={isMobile ? -35 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.6)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#e5e7eb",
                    }}
                    labelStyle={{ color: "#e5e7eb" }}
                    itemStyle={{ color: "#e5e7eb" }}
                    formatter={(value) => [formatNumber(value), "Players"]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.tier} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="stats-table-wrapper">
              <table className="leaderboard-table stats-table">
                <caption className="sr-only">
                  Division breakdown showing players, percentage of players, and
                  percentile cutoffs.
                </caption>
                <thead>
                  <tr>
                    <th>Division</th>
                    <th>Players</th>
                    <th>% of Players</th>
                    <th>Percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionTable.map((row) => (
                    <tr key={row.tier}>
                      <td>
                        <span
                          className="stats-division-pill"
                          style={{ backgroundColor: row.color }}
                        >
                          {row.tier}
                        </span>
                      </td>
                      <td>{formatNumber(row.count)}</td>
                      <td>{formatPercent(row.percentOfPlayers)}</td>
                      <td>
                        {row.percentile != null ?
                          `Top ${row.percentile.toFixed(1)}%`
                        : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="player-card stats-card">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
            Activity Overview
          </h2>
          <div className="stats-activity-layout">
            <div className="stats-chart">
              <h3 className="stats-section-title">Day of Week</h3>
              {dayOfWeekData.length > 0 ?
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={dayOfWeekData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.4)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: "#e5e7eb", dx: 6 }}
                      axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                      tickLine={false}
                      interval={0}
                      angle={isMobile ? -35 : -20}
                      textAnchor="end"
                      tickMargin={10}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.08)" }}
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.6)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                      formatter={(value) => [formatNumber(value), "Events"]}
                    />
                    <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              : <p className="player-subtitle">No activity data available.</p>}
            </div>

            <div className="stats-format-section">
              <h3 className="stats-section-title">Format Breakdown</h3>
              {formatEntries.length > 0 ?
                <div className="stats-format-grid">
                  {formatEntries.map((item) => (
                    <StatCard
                      key={item.format}
                      label={item.format}
                      value={formatNumber(item.count)}
                    />
                  ))}
                </div>
              : <p className="player-subtitle">No format data available.</p>}

              {tierEntries.length > 0 && (
                <>
                  <h3 className="stats-section-title">Tier Activity</h3>
                  <div className="stats-tier-grid">
                    {tierEntries.map((item) => (
                      <StatCard
                        key={item.tier}
                        label={item.tier}
                        value={formatNumber(item.count)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {stats && dailyActivityData.length > 0 && (
        <div className="player-card stats-card">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Daily Activity</h2>
          <div className="stats-scroll">
            <div
              className="stats-scroll-inner"
              style={{
                minWidth: Math.max(640, dailyActivityData.length * 20),
              }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={dailyActivityData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.4)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#e5e7eb" }}
                    axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                    tickLine={false}
                    interval={Math.max(
                      0,
                      Math.floor(dailyActivityData.length / 14),
                    )}
                    tickFormatter={formatDateShort}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.6)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#e5e7eb",
                    }}
                    labelStyle={{ color: "#e5e7eb" }}
                    itemStyle={{ color: "#e5e7eb" }}
                    formatter={(value) => [formatNumber(value), "Events"]}
                    labelFormatter={(value) => `Date: ${value}`}
                  />
                  <Bar dataKey="total" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {stats && countryRows.length > 0 && (
        <div className="player-card stats-card">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
            Country Highlights
          </h2>
          <div className="stats-table-wrapper">
            <table className="leaderboard-table stats-table stats-country-table">
              <caption className="sr-only">
                Top countries by total players with average MMR and top players.
              </caption>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Players</th>
                  <th>Avg MMR</th>
                  <th>Top 6 Avg MMR</th>
                  <th>Top Players</th>
                </tr>
              </thead>
              <tbody>
                {countryRows.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <div className="country-cell">
                        <Flag
                          code={row.code}
                          className="flag-icon-small"
                          aria-label={`Flag of ${row.code}`}
                        />
                        <span>{row.code}</span>
                      </div>
                    </td>
                    <td>{formatNumber(row.playerTotal)}</td>
                    <td>
                      {row.averageMmr != null ?
                        formatNumber(row.averageMmr)
                      : "N/A"}
                    </td>
                    <td>
                      {row.topSixMmr != null ? formatNumber(row.topSixMmr) : "N/A"}
                    </td>
                    <td className="country-top-players">
                      {row.topPlayers.length > 0 ?
                        row.topPlayers.map((name, index) => (
                          <span key={name} className="country-player-name">
                            <button
                              type="button"
                              className="leaderboard-name"
                              onClick={() =>
                                navigate(
                                  `/player/${encodeURIComponent(name)}?season=${season}` +
                                    (season >= 2 ? `&mmrType=${mmrType}` : ""),
                                )
                              }
                              aria-label={`View profile for ${name}`}
                            >
                              {name}
                            </button>
                            {index < row.topPlayers.length - 1 && (
                              <span className="country-name-separator">,</span>
                            )}
                          </span>
                        ))
                      : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats && rankThresholds.length > 0 && (
        <div className="player-card stats-card">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
            Rank Thresholds
          </h2>
          <div className="stats-table-wrapper">
            <table className="leaderboard-table stats-table">
              <caption className="sr-only">
                MMR thresholds for each rank.
              </caption>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>MMR Floor</th>
                </tr>
              </thead>
              <tbody>
                {rankThresholds.map((row) => (
                  <tr key={row.rank}>
                    <td>
                      <span
                        className="stats-division-pill"
                        style={{ backgroundColor: getRankColor(row.rank) }}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td>{formatNumber(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stats;
