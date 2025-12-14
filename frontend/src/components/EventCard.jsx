import { formatTimeAgo } from "../utils/playerUtils";

function EventCard({ event, averageScore }) {
    return (
        <article className="event-card">
            <div className="event-header">
                <p className="event-score">
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
            <a
                className="event-link"
                href={`https://lounge.mkcentral.com/mkworld/TableDetails/${event.changeId}`}
                target="_blank"
                rel="noreferrer"
            >
                View Table
            </a>
        </article>
    );
}

export default EventCard;
