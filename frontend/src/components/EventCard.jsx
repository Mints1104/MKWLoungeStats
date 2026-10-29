import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo, getEventFormat } from "../utils/playerUtils";

const EventCard = memo(function EventCard({
  event,
  averageScore,
  avg12,
  avg24,
  // A Table event whose table was later deleted (its TableDelete refunds the MMR)
  tableWasDeleted = false,
}) {
  const navigate = useNavigate();
  const isTable = event.reason === "Table";
  const isStrike = event.reason === "Strike";
  const isPenalty = event.reason === "Penalty";
  const isStrikeDeleted = event.reason === "StrikeDelete";
  const isTableDeleted = event.reason === "TableDelete";
  const isBonus = event.reason === "Bonus";
  const isPlacement = event.reason === "Placement";

  const timeLabel =
    isStrike || isPenalty ? "Penalty applied"
    : isTableDeleted ? "Deleted"
    : isStrikeDeleted ? "Removed"
    : isBonus ? "Awarded"
    : "Played";

  // Select average based on event format
  const relevantAverage =
    event.numPlayers === 12 ?
      avg12 != null ?
        avg12
      : averageScore
    : event.numPlayers === 24 ?
      avg24 != null ?
        avg24
      : averageScore
    : averageScore;

  const getEventMessage = () => {
    if (isStrike) {
      return (
        <>
          Received a <span className="penalty-label">Penalty (Strike)</span>
        </>
      );
    }
    if (isPenalty) {
      return (
        <>
          Received a <span className="penalty-label">Penalty</span>
        </>
      );
    }
    if (isTable && event.changeId != null) {
      const isAboveAvg =
        relevantAverage != null && event.score > relevantAverage;
      const partnerScores =
        Array.isArray(event.partnerScores) ?
          event.partnerScores.filter(
            (score) => typeof score === "number" && !Number.isNaN(score),
          )
        : [];
      return (
        <>
          <div>
            Scored:{" "}
            <span className={isAboveAvg ? "above-average" : "below-average"}>
              {event.score}
            </span>{" "}
          </div>
          {partnerScores.length > 0 && (
            <div>
              Partner {partnerScores.length > 1 ? "Scores" : "Score"}:{" "}
              {partnerScores.join(", ")}
            </div>
          )}
          <div>Placed: #{event.rank}</div>
          <div>
            Format: {event.numPlayers}p{" "}
            {getEventFormat(event.numPlayers, event.numTeams)} Tier {event.tier}
          </div>
          {tableWasDeleted && (
            <div className="penalty-label">
              Table deleted (not counted in stats)
            </div>
          )}
        </>
      );
    }
    if (isPlacement) return "Placement Event";
    if (isBonus) return "Bonus";
    if (isTableDeleted) return "Table Deleted";
    if (isStrikeDeleted) return "Strike Removed";

    //fallback
    return "Unknown";
  };

  return (
    <article className="event-card">
      <div className="event-header">
        <div className="event-score">{getEventMessage()}</div>

        <p
          className={`event-delta ${
            event.mmrDelta > 0 ? "positive" : "negative"
          }`}
        >
          {event.mmrDelta > 0 ? "+" : ""}
          {event.mmrDelta}
        </p>
      </div>
      <p className="event-mmr">New MMR: {event.newMmr}</p>
      <p className="event-time">
        {timeLabel} {formatTimeAgo(event.time)}
      </p>
      {isTable && event.changeId != null && (
        <a
          href={`/table/${String(event.changeId).trim()}`}
          className="event-link"
          onClick={(e) => {
            const tableId = String(event.changeId).trim();
            if (tableId && tableId !== "undefined" && tableId !== "null") {
              e.preventDefault();
              navigate(`/table/${tableId}`);
            }
          }}
        >
          View Table
        </a>
      )}
    </article>
  );
});

export default EventCard;
