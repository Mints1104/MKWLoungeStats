import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "../utils/playerUtils";

const EventCard = memo(function EventCard({ event, averageScore, avg12, avg24 }) {
    const navigate = useNavigate();
    const isTable = event.reason === "Table";
    const isPenalty = event.reason === "Strike";
    const isTableDeleted = event.reason ==="TableDelete";
    const isBonus = event.reason ==="Bonus";
    const isPlacement = event.reason ==="Placement"

    // Determine which average to use based on event type, falling back to overall average if specific average is null
    const relevantAverage = event.numPlayers === 12 
        ? (avg12 != null ? avg12 : averageScore)
        : event.numPlayers === 24 
        ? (avg24 != null ? avg24 : averageScore)
        : averageScore;


    //Helper function to show the correct message regarding the player's event based on the API's event "reason".
    const getEventMessage = () => {
    if (isPenalty) {
        return (
            <>
                Received a <span className="penalty-label">Penalty (Strike)</span>
            </>
        );
    }
    if (isTable && event.changeId != null) {
        const isAboveAvg = relevantAverage != null && event.score > relevantAverage;
        return (
            <>
                Scored{" "}
                <span className={isAboveAvg ? "above-average" : "below-average"}>
                    {event.score}
                </span>{" "}
                in a {event.numPlayers}p event
            </>
        );
    }
    if (isPlacement) return "Placement Event";
    if (isBonus) return "Bonus";
    if (isTableDeleted) return "Table Deleted";

    // 4. Fallback if no conditions are met
    return "Unknown";
};

    return (
        <article className="event-card">
            <div className="event-header">
                <p className="event-score">
                   {getEventMessage()}
                </p>

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
                {isPenalty ? "Penalty applied" : "Played"} {formatTimeAgo(event.time)}
            </p>
            {isTable && event.changeId != null && (
                <button
                    type="button"
                    className="event-link"
                    onClick={() => {
                        const tableId = String(event.changeId).trim();
                        if (tableId && tableId !== 'undefined' && tableId !== 'null') {
                            navigate(`/table/${tableId}`);
                        }
                    }}
                >
                    View Table
                </button>
            )}
        </article>
    );
});

export default EventCard;
