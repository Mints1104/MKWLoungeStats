import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "../utils/playerUtils";

const EventCard = memo(function EventCard({ event, averageScore }) {
    const navigate = useNavigate();

    return (
        <article className="event-card">
            <div className="event-header">
                <p className="event-score">
                    {event.changeId != null ? (
                        <>
                            Scored{" "}
                            <span
                                className={
                                    event.score > averageScore
                                        ? "above-average"
                                        : "below-average"
                                }
                            >
                                {event.score}
                            </span>{" "}
                            in a {event.numPlayers}p event
                        </>
                    ) : (
                        "Placement Event"
                    )}
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
            <p className="event-time">Played {formatTimeAgo(event.time)}</p>
            {event.changeId != null && (
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
