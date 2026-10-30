import { getSeasonLabel } from "../config/seasons";
import { formatWinRate, getRankColor, winRateClassName } from "../utils/playerUtils";

function ladderLabel(mmrType) {
  return mmrType == null ? "Combined" : `${mmrType}p`;
}

/**
 * One player's record on every season and ladder. Collapsed until opened, since it
 * needs one request per ladder. The data comes from useCareer in the profile page,
 * so it survives this card remounting when the profile reloads.
 * @param {Object} props
 * @param {Object} props.career - useCareer(playerName)
 * @param {string} props.playerName
 * @param {number} props.season - Season being viewed (its row is highlighted)
 * @param {number} props.mmrType - Ladder being viewed
 * @param {Function} props.onSelectLadder - `(season, mmrType)` for a picked row
 */
function CareerView({ career, playerName, season, mmrType, onSelectLadder }) {
  const { open, rows, failedCount, loading, error, load: loadCareer } = career;

  if (!open) {
    return (
      <div className="player-summary career-card">
        <div className="player-events-header">
          <h3>Career</h3>
          <button
            type="button"
            className="secondary-button"
            onClick={loadCareer}
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
