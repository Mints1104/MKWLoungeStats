import { useId, useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FilterToggle from "./FilterToggle";
import {
  calculateGradientStops,
  findPeakPoint,
  getMmrAxis,
  getVisibleRankLines,
} from "../utils/chartUtils";
import { getEventFormat } from "../utils/playerUtils";

// Per-view UI prefs (sessionStorage)
const X_MODE_KEY = "mmrChartXModePref";
const RANK_LINES_KEY = "mmrChartRankLinesPref";

// Below this many points the range picker is more clutter than help
const BRUSH_MIN_POINTS = 30;

const X_MODE_OPTIONS = [
  { value: "date", label: "By date" },
  { value: "event", label: "By event" },
];

const PENALTY_REASONS = new Set(["Strike", "Penalty"]);
const PEAK_COLOR = "#38bdf8";
const PENALTY_COLOR = "#ef4444";
const DELETED_COLOR = "#94a3b8";
const RANK_LINE_COLOR = "#f59e0b";

// Outline in the card colour so labels stay readable where they cross the line
const LABEL_HALO = { stroke: "#0f172a", strokeWidth: 3, paintOrder: "stroke" };

// Keep the peak label inside the plot: beside the dot near either edge, above it
// elsewhere
function peakLabelPosition(index, count) {
  const fraction = count > 1 ? index / (count - 1) : 0.5;
  if (fraction > 0.85) return "left";
  if (fraction < 0.15) return "right";
  return "top";
}

function readPref(key, fallback) {
  try {
    return sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

const shortDate = (ms) =>
  new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const longDate = (ms) =>
  new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function describePoint(point) {
  switch (point.reason) {
    case "Table":
      return null;
    case "Strike":
      return "Penalty (strike)";
    case "Penalty":
      return "Penalty";
    case "StrikeDelete":
      return "Strike removed";
    case "TableDelete":
      return "Table deleted, MMR refunded";
    case "Bonus":
      return "Bonus";
    case "Placement":
      return "Placement";
    default:
      return point.reason ?? null;
  }
}

function MmrTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const format = getEventFormat(point.numPlayers, point.numTeams);
  const note = describePoint(point);

  return (
    <div className="mmr-tooltip">
      <p className="mmr-tooltip-title">
        {point.time != null ? `${longDate(point.time)} · ` : `Event ${point.event} · `}
        {point.mmr}
      </p>
      {point.reason === "Table" && point.score != null && (
        <p>
          Scored {point.score}
          {point.placement != null && ` · ${ordinal(point.placement)}`}
        </p>
      )}
      {point.reason === "Table" && (point.tier || format) && (
        <p>{[point.tier && `Tier ${point.tier}`, format].filter(Boolean).join(" · ")}</p>
      )}
      {note && <p>{note}</p>}
      {point.tableDeleted && <p>Table later deleted (not counted in stats)</p>}
      {point.mmrDelta != null && (
        <p className={point.mmrDelta > 0 ? "positive" : point.mmrDelta < 0 ? "negative" : ""}>
          {signed(point.mmrDelta)} MMR
        </p>
      )}
    </div>
  );
}

function renderMarker({ cx, cy, payload, index }) {
  const key = `marker-${index}`;
  if (cx == null || cy == null) return <g key={key} />;
  if (PENALTY_REASONS.has(payload.reason)) {
    return (
      <circle
        key={key}
        cx={cx}
        cy={cy}
        r={5}
        fill={PENALTY_COLOR}
        stroke="#0f172a"
        strokeWidth={1.5}
      />
    );
  }
  if (payload.tableDeleted) {
    return (
      <circle
        key={key}
        cx={cx}
        cy={cy}
        r={5}
        fill="none"
        stroke={DELETED_COLOR}
        strokeWidth={1.5}
      />
    );
  }
  return <g key={key} />;
}

/**
 * MMR over the season, by date or by event number, with the line coloured by rank,
 * dashed rank-boundary lines, peak / penalty / deleted-table markers, a detailed
 * tooltip and (for long seasons) a range picker.
 * @param {Object} props
 * @param {Array} props.data - calculateMmrHistoryData points, oldest first
 * @param {string} props.gradientId - Unique SVG gradient id
 * @param {Array} props.thresholds - Rank thresholds for the season and ladder
 */
function MmrHistoryChart({ data, gradientId, thresholds }) {
  const summaryId = useId();
  const [xMode, setXMode] = useState(() =>
    readPref(X_MODE_KEY, "date") === "event" ? "event" : "date",
  );
  const [showRankLines, setShowRankLines] = useState(
    () => readPref(RANK_LINES_KEY, "true") !== "false",
  );
  // Brush range, remembered only for the data it was picked on
  const [range, setRange] = useState(null);

  const xKey = xMode === "date" ? "time" : "event";
  const points = useMemo(
    () => (xMode === "date" ? data.filter((point) => point.time != null) : data),
    [data, xMode],
  );

  const rangeValid =
    range && range.points === points && range.end < points.length;
  const start = rangeValid ? range.start : 0;
  const end = rangeValid ? range.end : points.length - 1;
  const visible = useMemo(() => points.slice(start, end + 1), [points, start, end]);

  // Drawn over the visible slice: the gradient spans the drawn line's bounding box
  const gradientStops = useMemo(
    () => calculateGradientStops(visible, xMode === "date" ? "time" : undefined),
    [visible, xMode],
  );
  const peak = useMemo(() => findPeakPoint(points), [points]);
  const rankLines = useMemo(
    () => (showRankLines ? getVisibleRankLines(thresholds, visible) : []),
    [showRankLines, thresholds, visible],
  );

  if (!points.length) {
    return <p className="player-subtitle">No MMR changes this season yet.</p>;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const showBrush = points.length >= BRUSH_MIN_POINTS;
  const peakIndex = peak ? visible.indexOf(peak) : -1;
  const yAxis = getMmrAxis(visible) ?? { domain: ["auto", "auto"], ticks: undefined };

  return (
    <>
      <div className="player-events-header mmr-chart-header">
        <h3>MMR History</h3>
        <div className="mmr-chart-controls">
          <FilterToggle
            activeFilter={xMode}
            onFilterChange={(value) => {
              setXMode(value);
              setRange(null);
              writePref(X_MODE_KEY, value);
            }}
            options={X_MODE_OPTIONS}
            ariaLabel="Horizontal axis"
          />
          <label className="mmr-chart-checkbox">
            <input
              type="checkbox"
              checked={showRankLines}
              onChange={(e) => {
                setShowRankLines(e.target.checked);
                writePref(RANK_LINES_KEY, String(e.target.checked));
              }}
            />
            Rank lines
          </label>
        </div>
      </div>

      <p className="sr-only" id={summaryId}>
        MMR went from {first.mmr} to {last.mmr} over {data.length} changes
        {peak ?
          `, peaking at ${peak.mmr}${peak.time != null ? ` on ${longDate(peak.time)}` : ""}`
        : ""}
        .
      </p>

      <div
        className={`mmr-chart-frame${showBrush ? " mmr-chart-frame-brush" : ""}`}
        aria-describedby={summaryId}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 16, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                {gradientStops.map((stop, idx) => (
                  <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            {xMode === "date" ?
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={shortDate}
                stroke="#9ca3af"
                minTickGap={24}
              />
            : <XAxis
                dataKey="event"
                stroke="#9ca3af"
                label={{ value: "Events", position: "insideBottom", offset: -5 }}
              />
            }
            <YAxis
              stroke="#9ca3af"
              label={{ value: "MMR", angle: -90, position: "insideLeft" }}
              domain={yAxis.domain}
              ticks={yAxis.ticks}
              allowDataOverflow
            />
            <Tooltip content={<MmrTooltip />} />
            {rankLines.map((rank) => (
              <ReferenceLine
                key={rank.name}
                y={rank.min}
                stroke={RANK_LINE_COLOR}
                strokeDasharray="5 4"
                strokeOpacity={0.75}
                label={{
                  value: `${rank.name} ${rank.min}`,
                  // Left end: seasons usually climb, so the line is lower there
                  position: "insideTopLeft",
                  fill: "#fbbf24",
                  fontSize: 11,
                  ...LABEL_HALO,
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="mmr"
              stroke={`url(#${gradientId})`}
              strokeWidth={2.5}
              dot={renderMarker}
              activeDot={{ r: 4, fill: "#e5e7eb", strokeWidth: 0 }}
              isAnimationActive={false}
              strokeLinecap="round"
            />
            {peakIndex >= 0 && (
              <ReferenceDot
                x={peak[xKey]}
                y={peak.mmr}
                r={5}
                fill={PEAK_COLOR}
                stroke="#0f172a"
                strokeWidth={1.5}
                label={{
                  value: `Peak ${peak.mmr}`,
                  position: peakLabelPosition(peakIndex, visible.length),
                  offset: 8,
                  fill: "#e5e7eb",
                  fontSize: 11,
                  ...LABEL_HALO,
                }}
              />
            )}
            {showBrush && (
              <Brush
                dataKey={xKey}
                height={26}
                stroke="#38bdf8"
                fill="#0f172a"
                travellerWidth={8}
                startIndex={start}
                endIndex={end}
                tickFormatter={xMode === "date" ? shortDate : undefined}
                onChange={({ startIndex, endIndex }) =>
                  setRange({ points, start: startIndex, end: endIndex })
                }
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mmr-chart-legend">
        <li>
          <span className="legend-dot" style={{ background: PEAK_COLOR }} aria-hidden="true" />
          Peak MMR
        </li>
        <li>
          <span className="legend-dot" style={{ background: PENALTY_COLOR }} aria-hidden="true" />
          Penalty / strike
        </li>
        <li>
          <span
            className="legend-dot legend-dot-hollow"
            style={{ borderColor: DELETED_COLOR }}
            aria-hidden="true"
          />
          Deleted table
        </li>
        {showRankLines && (
          <li>
            <span className="legend-dash" aria-hidden="true" />
            Rank boundary
          </li>
        )}
        {showBrush && <li className="mmr-chart-hint">Drag the bar below the chart to zoom</li>}
      </ul>
    </>
  );
}

export default MmrHistoryChart;
