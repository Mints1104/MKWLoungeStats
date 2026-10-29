import { useMemo, useState } from "react";
import FilterToggle from "./FilterToggle";
import { calculateBreakdown } from "../utils/playerInsights";
import { formatWinRate, winRateClassName } from "../utils/playerUtils";

const BREAKDOWN_KEY = "playerBreakdownPref";

const GROUP_OPTIONS = [
  { value: "tier", label: "By tier" },
  { value: "format", label: "By format" },
];

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

/**
 * Results per tier or per format for the season (deleted tables left out). Picking
 * a row narrows the recent events list to it; picking it again clears that.
 * @param {Object} props
 * @param {Array} props.events - mmrChanges
 * @param {boolean} props.splitByPlayerCount - Pre-split season: formats as "24p FFA"
 * @param {string|null} props.selectedTier - Tier the events list is narrowed to
 * @param {string|null} props.selectedFormat - Format row key the list is narrowed to
 * @param {Function} props.onSelect - `({ by, key, keys })`, key null to clear
 */
function PerformanceBreakdown({
  events,
  splitByPlayerCount,
  selectedTier,
  selectedFormat,
  onSelect,
}) {
  const [by, setBy] = useState(() => {
    try {
      return sessionStorage.getItem(BREAKDOWN_KEY) === "format" ? "format" : "tier";
    } catch {
      return "tier";
    }
  });

  const rows = useMemo(
    () => calculateBreakdown(events, by, { splitByPlayerCount }),
    [events, by, splitByPlayerCount],
  );

  if (!rows.length) return null;

  const selectedKey = by === "tier" ? selectedTier : selectedFormat;
  const keys = rows.map((row) => row.key);

  const changeGrouping = (value) => {
    setBy(value);
    try {
      sessionStorage.setItem(BREAKDOWN_KEY, value);
    } catch {
      // ignore
    }
  };

  return (
    <div className="player-summary breakdown-card">
      <div className="player-events-header">
        <h3 id="breakdown-heading">Performance breakdown</h3>
        <FilterToggle
          activeFilter={by}
          onFilterChange={changeGrouping}
          options={GROUP_OPTIONS}
          ariaLabel="Group performance by"
        />
      </div>

      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table breakdown-table" aria-labelledby="breakdown-heading">
          <thead>
            <tr>
              <th scope="col">{by === "tier" ? "Tier" : "Format"}</th>
              <th scope="col">Events</th>
              <th scope="col">Avg score</th>
              <th scope="col">Avg place</th>
              <th scope="col">Win rate</th>
              <th scope="col">Net MMR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.key === selectedKey;
              return (
                <tr
                  key={row.key}
                  className={selected ? "breakdown-row-selected" : undefined}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="leaderboard-name"
                      aria-pressed={selected}
                      onClick={() =>
                        onSelect({ by, key: selected ? null : row.key, keys })
                      }
                      title={
                        selected ?
                          "Show every event again"
                        : `Show only ${row.label} in recent events`
                      }
                    >
                      {row.label}
                    </button>
                  </th>
                  <td>
                    <div className="breakdown-events">
                      <span
                        className="breakdown-bar"
                        style={{ width: `${Math.max(row.share * 100, 4)}%` }}
                        aria-hidden="true"
                      />
                      <span>{row.events}</span>
                    </div>
                  </td>
                  <td>{row.avgScore != null ? row.avgScore.toFixed(1) : "N/A"}</td>
                  <td>
                    {row.avgPlacement != null ? row.avgPlacement.toFixed(1) : "N/A"}
                  </td>
                  <td className={winRateClassName(row.winRate)}>
                    {formatWinRate(row.winRate, 1)}
                  </td>
                  <td
                    className={
                      row.netMmr > 0 ? "positive"
                      : row.netMmr < 0 ?
                        "negative"
                      : ""
                    }
                  >
                    {signed(row.netMmr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="breakdown-note">
        Counted events only (deleted tables left out). Pick a{" "}
        {by === "tier" ? "tier" : "format"} to narrow the recent events below to it.
      </p>
    </div>
  );
}

export default PerformanceBreakdown;
