import { useCallback, useState } from "react";
import { loungeApi } from "../api/loungeApi";
import { useAbortableRequest } from "../hooks/useAbortableRequest";
import { getAllLadders, getSeasonLabel } from "../config/seasons";
import { formatWinRate, getRankColor, winRateClassName } from "../utils/playerUtils";

function ladderLabel(mmrType) {
  return mmrType == null ? "Combined" : `${mmrType}p`;
}

/**
 * One player's record on every season and ladder. Collapsed until opened, since it
 * needs one request per ladder (six for seasons 0-3).
 */
function CareerView({ playerName, season, mmrType, onSelectLadder }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [failedCount, setFailedCount] = useState(0);
  const { loading, error, run } = useAbortableRequest();

  const loadCareer = useCallback(() => {
    setRows(null);
    setFailedCount(0);

    run(
      async (signal) => {
        const ladders = getAllLadders();
        const settled = await Promise.allSettled(
          ladders.map((ladder) =>
            loungeApi.getPlayerDetails(
              playerName,
              ladder.season,
              ladder.mmrType ?? 24,
              signal,
            ),
          ),
        );

        const aborted = settled.find(
          (result) => result.reason?.name === "AbortError",
        );
        if (aborted) throw aborted.reason;

        const played = [];
        let failed = 0;
        settled.forEach((result, index) => {
          if (result.status === "fulfilled") {
            // The API answers for ladders never played too, as a 0-event
            // "Placement" record
            if ((result.value?.eventsPlayed ?? 0) > 0) {
              played.push({ ...ladders[index], details: result.value });
            }
          } else if (result.reason?.status !== 404) {
            // 404 just means no games on that ladder
            failed += 1;
          }
        });
        return { played, failed };
      },
      { mapError: (err) => err.message || "Failed to load career" },
    ).then((data) => {
      if (data) {
        setRows(data.played);
        setFailedCount(data.failed);
      }
    });
  }, [playerName, run]);

  if (!open) {
    return (
      <div className="player-summary career-card">
        <div className="player-events-header">
          <h3>Career</h3>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setOpen(true);
              loadCareer();
            }}
          >
            Show all seasons
          </button>
        </div>
      </div>
    );
  }

  const isCurrent = (row) =>
    row.season === season &&
    (row.mmrType == null || row.mmrType === mmrType);

  return (
    <div className="player-summary career-card">
      <h3>Career</h3>

      {error && (
        <p className="player-error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <div className="loading-skeleton" aria-live="polite" aria-label="Loading career">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      )}

      {rows && rows.length === 0 && !failedCount && (
        <p className="player-subtitle">No Lounge records found for any season.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table career-table">
            <caption className="sr-only">
              {playerName}&apos;s results on every season and ladder they played
            </caption>
            <thead>
              <tr>
                <th>Season</th>
                <th>Ladder</th>
                <th>Rank</th>
                <th>MMR</th>
                <th>Peak</th>
                <th>Placing</th>
                <th>Events</th>
                <th>Win rate</th>
                <th>Avg score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.season}-${row.mmrType}`}
                  className={isCurrent(row) ? "career-row-current" : undefined}
                  aria-current={isCurrent(row) ? "true" : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="leaderboard-name"
                      onClick={() => onSelectLadder(row.season, row.mmrType)}
                      aria-label={`View ${getSeasonLabel(row.season)} ${ladderLabel(row.mmrType)}`}
                    >
                      {getSeasonLabel(row.season)}
                    </button>
                  </td>
                  <td>{ladderLabel(row.mmrType)}</td>
                  <td style={{ color: getRankColor(row.details.rank) }}>
                    {row.details.rank ?? "N/A"}
                  </td>
                  <td>{row.details.mmr ?? "N/A"}</td>
                  <td>{row.details.maxMmr ?? "N/A"}</td>
                  <td>
                    {row.details.overallRank != null ?
                      `#${row.details.overallRank}`
                    : "N/A"}
                  </td>
                  <td>{row.details.eventsPlayed ?? 0}</td>
                  <td className={winRateClassName(row.details.winRate)}>
                    {formatWinRate(row.details.winRate, 1)}
                  </td>
                  <td>
                    {row.details.averageScore != null ?
                      row.details.averageScore.toFixed(1)
                    : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {failedCount > 0 && (
        <p className="player-error" role="status">
          {failedCount === 1 ?
            "One season couldn't be loaded."
          : `${failedCount} seasons couldn't be loaded.`}{" "}
          <button type="button" className="secondary-button" onClick={loadCareer}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}

export default CareerView;
