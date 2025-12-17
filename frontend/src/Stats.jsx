import { useEffect, useRef, useState, useMemo } from "react";
import { loungeApi } from "./api/loungeApi";
import PageHeader from "./components/PageHeader";
import StatCard from "./components/StatCard";
import { getRankColor } from "./utils/playerUtils";
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

function formatMmr(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `${value.toFixed(1)}%`;
}

function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;

    async function fetchStats() {
      try {
        setLoading(true);
        setError("");
        setStats(null);

        const data = await loungeApi.getPlayerStats(
          { season: 1, game: "mkworld" },
          controller.signal
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
  }, []);

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

    const order =
      stats.divisionsToTier?.Q ||
      stats.divisionsToTier?.Q?.slice() ||
      undefined;

    const byTier = new Map(
      stats.divisionData.map((d) => [d.tier, d.count ?? 0])
    );

    const orderedTiers = Array.isArray(order)
      ? order.filter((tier) => byTier.has(tier) && tier !== "Placement")
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
    [divisionTable]
  );

  return (
    <div className="player-info-page">
      <div className="player-card">
        <PageHeader
          title="Lounge Overview"
          subtitle="Global player statistics for Mario Kart World Lounge."
        />

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
            <StatCard
              label="Average MMR"
              value={formatMmr(stats.averageMmr)}
            />
            <StatCard
              label="Median MMR"
              value={formatMmr(stats.medianMmr)}
            />
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
                        {row.percentile != null
                          ? `Top ${row.percentile.toFixed(1)}%`
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
    </div>
  );
}

export default Stats;


