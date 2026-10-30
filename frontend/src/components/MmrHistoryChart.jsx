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
  brightenForDarkBackground,
  calculateGradientStops,
  findPeakPoint,
  getMarkerKind,
  getMmrAxis,
  getVisibleRankLines,
} from "../utils/chartUtils";
import { getEventFormat, getRankColor } from "../utils/playerUtils";

// Per-view UI prefs (sessionStorage)
const X_MODE_KEY = "mmrChartXModePref";
// JSON { peak, penalties, deleted, rankLines }: which overlays the legend has on
const OVERLAYS_KEY = "mmrChartOverlaysPref";

const DEFAULT_OVERLAYS = {
  peak: true,
  penalties: true,
  deleted: true,
  rankLines: true,
};

function readOverlays() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(OVERLAYS_KEY) || "{}");
    return Object.fromEntries(
      Object.keys(DEFAULT_OVERLAYS).map((key) => [
        key,
        typeof saved?.[key] === "boolean" ? saved[key] : DEFAULT_OVERLAYS[key],
      ]),
    );
  } catch {
    return DEFAULT_OVERLAYS;
  }
}

// Below this many points the range picker is more clutter than help
const BRUSH_MIN_POINTS = 30;

const X_MODE_OPTIONS = [
  { value: "date", label: "By date" },
  { value: "event", label: "By event" },
];

const PEAK_COLOR = "#38bdf8";
const PENALTY_COLOR = "#ef4444";
const DELETED_COLOR = "#94a3b8";

const LEGEND_ITEMS = [
  {
    key: "peak",
    label: "Peak MMR",
    hint: "the peak MMR marker",
    swatch: <span className="legend-dot" style={{ background: PEAK_COLOR }} aria-hidden="true" />,
  },
  {
    key: "penalties",
    label: "Penalty / strike",
    hint: "penalty and strike markers",
    swatch: <span className="legend-dot" style={{ background: PENALTY_COLOR }} aria-hidden="true" />,
  },
  {
    key: "deleted",
    label: "Deleted table",
    hint: "deleted table markers",
    swatch: (
      <span
        className="legend-dot legend-dot-hollow"
        style={{ borderColor: DELETED_COLOR }}
        aria-hidden="true"
      />
    ),
  },
  {
    key: "rankLines",
    label: "Rank lines",
    hint: "rank boundary lines (drawn in each rank's colour)",
    swatch: <span className="legend-dash" aria-hidden="true" />,
  },
];

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

function renderMarker({ cx, cy, payload, index }, overlays) {
  const key = `marker-${index}`;
  if (cx == null || cy == null) return <g key={key} />;
  const kind = getMarkerKind(payload, overlays);
  if (kind === "penalty") {
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
  if (kind === "deleted") {
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
  // Overlays switched on and off by tapping their legend item
  const [overlays, setOverlays] = useState(readOverlays);
  const toggleOverlay = (key) => {
    setOverlays((current) => {
      const next = { ...current, [key]: !current[key] };
      writePref(OVERLAYS_KEY, JSON.stringify(next));
      return next;
    });
  };
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
    () => (overlays.rankLines ? getVisibleRankLines(thresholds, visible) : []),
    [overlays.rankLines, thresholds, visible],
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
            {rankLines.map((rank) => {
              // Each line is where a rank starts, drawn in that rank's colour
              // (lightened if too dark to read on the card, e.g. Grandmaster)
              const color = brightenForDarkBackground(getRankColor(rank.name));
              return (
                <ReferenceLine
                  key={rank.name}
                  y={rank.min}
                  stroke={color}
                  strokeDasharray="5 4"
                  strokeOpacity={0.8}
                  label={{
                    value: `${rank.name} ${rank.min}`,
                    // Left end: seasons usually climb, so the line is lower there
                    position: "insideTopLeft",
                    fill: color,
                    fontSize: 11,
                    ...LABEL_HALO,
                  }}
                />
              );
            })}
            <Line
              type="monotone"
              dataKey="mmr"
              stroke={`url(#${gradientId})`}
              strokeWidth={2.5}
              dot={(props) => renderMarker(props, overlays)}
              activeDot={{ r: 4, fill: "#e5e7eb", strokeWidth: 0 }}
              isAnimationActive={false}
              strokeLinecap="round"
            />
            {overlays.peak && peakIndex >= 0 && (
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

      {/* The key doubles as the switches: tap an item to show or hide it */}
      <ul className="mmr-chart-legend" aria-label="Chart markers">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={`legend-toggle${overlays[item.key] ? "" : " legend-toggle-off"}`}
              aria-pressed={overlays[item.key]}
              onClick={() => toggleOverlay(item.key)}
              title={overlays[item.key] ? `Hide ${item.hint}` : `Show ${item.hint}`}
            >
              {item.swatch}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="mmr-chart-hint">
        Tap an item above to show or hide it
        {showBrush ? ". Drag the bar below the chart to zoom." : "."}
      </p>
    </>
  );
}

export default MmrHistoryChart;
