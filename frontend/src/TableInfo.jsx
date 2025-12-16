import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loungeApi } from "./api/loungeApi";
import PageHeader from "./components/PageHeader";

function TableInfo() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(null);

  const fetchTable = useCallback(async () => {
    // Ensure tableId is converted to string and trimmed
    const idStr = tableId != null ? String(tableId).trim() : "";
    if (!idStr || idStr === "undefined" || idStr === "null") {
      setError("No table ID provided in URL");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      if (requestRef.current) {
        requestRef.current.abort();
      }

      const controller = new AbortController();
      requestRef.current = controller;

      const data = await loungeApi.getTableById(idStr, controller.signal);
      setResult(data || null);
      requestRef.current = null;
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      setError(err.message || "Failed to fetch table");
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchTable();
    return () => {
      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
      }
    };
  }, [fetchTable]);

  const formatIso = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const tableImageUrl =
    result?.url && typeof result.url === "string"
      ? `https://lounge.mkcentral.com${result.url}`
      : null;

  return (
    <div className="player-info-page">
      <div className="player-card">
        <PageHeader
          title={result ? `Table #${result.id}` : "Event Table"}
          subtitle="Viewing standings and MMR changes for this lounge event."
        >
          <button
            className="player-button"
            type="button"
            onClick={() => {
              if (window.history.length <= 1) {
                navigate(-1);
              } else {
                navigate(-1);
              }
            }}
            style={{ marginBottom: "1rem", width: "auto" }}
          >
            ← Back
          </button>
        </PageHeader>

        {error && (
          <p className="player-error" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {loading && (
          <div
            className="loading-skeleton"
            aria-live="polite"
            aria-label="Loading table data"
          >
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        )}
      </div>

      {result && (
        <>
          {tableImageUrl && (
            <div className="player-card table-image-card">
              <div className="table-image-wrapper">
                <img
                  src={tableImageUrl}
                  alt={`Lounge table image for table #${result.id}`}
                  className="table-image"
                />
              </div>
              <p className="table-image-link">
                <a
                  href={tableImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-link"
                >
                  Open full-size image in new tab
                </a>
              </p>
            </div>
          )}

          <div className="player-summary">
            <h2>Table #{result.id}</h2>
            <p>
              <strong>Game:</strong> {result.game?.toUpperCase?.() || "N/A"}
            </p>
            <p>
              <strong>Season:</strong> {result.season ?? "N/A"}
            </p>
            <p>
              <strong>Format:</strong> {result.format || "N/A"}
            </p>
            <p>
              <strong>Tier:</strong> {result.tier || "N/A"}
            </p>
            <p>
              <strong>Players:</strong> {result.numPlayers ?? "N/A"}
              
            </p>
            <p>
              <strong>Created:</strong> {formatIso(result.createdOn)}
            </p>
            <p>
              <strong>Verified:</strong> {formatIso(result.verifiedOn)}
            </p>
          </div>

          {Array.isArray(result.teams) && result.teams.length > 0 && (
            <div className="player-card leaderboard-card">
              <div className="leaderboard-table-wrapper">
                <table className="leaderboard-table">
                  <caption className="sr-only">
                    Event standings showing rank, player, score, and MMR
                    changes.
                  </caption>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Country</th>
                      <th>Score</th>
                      <th>Prev MMR</th>
                      <th>New MMR</th>
                      <th>MMR Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.teams.map((team, teamIndex) =>
                      (team.scores || []).map((score, scoreIndex) => (
                        <tr
                          key={`${teamIndex}-${score.playerId}-${scoreIndex}`}
                        >
                          <td className="rank-cell">#{team.rank}</td>
                          <td>
                            <button
                              type="button"
                              className="leaderboard-name"
                              onClick={() =>
                                navigate(
                                  `/player/${encodeURIComponent(
                                    score.playerName
                                  )}`
                                )
                              }
                              aria-label={`View profile for ${score.playerName}`}
                            >
                              {score.playerName}
                            </button>
                          </td>
                          <td>{score.playerCountryCode || "—"}</td>
                          <td>{score.score}</td>
                          <td>{score.prevMmr}</td>
                          <td>{score.newMmr}</td>
                          <td
                            className={
                              score.delta > 0
                                ? "positive"
                                : score.delta < 0
                                ? "negative"
                                : ""
                            }
                          >
                            {score.delta > 0 ? `+${score.delta}` : score.delta}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!Array.isArray(result.teams) || result.teams.length === 0) && (
            <div className="player-card leaderboard-card">
              <p className="player-subtitle">
                This table does not contain any team or player score data.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TableInfo;


