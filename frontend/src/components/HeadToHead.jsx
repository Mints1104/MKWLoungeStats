import { useMemo } from "react";
import { Link } from "react-router-dom";
import { calculateHeadToHeadPairs } from "../utils/playerInsights";

const times = (count) => `${count} ${count === 1 ? "time" : "times"}`;

function formatScore(value) {
  return value != null ? value.toFixed(1) : "N/A";
}

function HeadToHeadPair({ a, b, record, colorA, colorB }) {
  const decided = record.aAhead + record.bAhead;
  const aShare = decided ? (record.aAhead / decided) * 100 : 50;

  return (
    <li className="h2h-pair">
      <div className="h2h-names">
        <span style={{ color: colorA }}>{a.name}</span>
        <span className="h2h-vs">vs</span>
        <span style={{ color: colorB }}>{b.name}</span>
      </div>

      {record.meetings === 0 ?
        <p className="player-subtitle">
          {record.teammates > 0 ?
            `Never faced each other, but teamed up ${times(record.teammates)}.`
          : "Haven't played in the same table this season."}
        </p>
      : <>
          <div
            className="h2h-bar"
            role="img"
            aria-label={`${a.name} placed ahead ${times(record.aAhead)}, ${b.name} ${times(record.bAhead)}`}
          >
            <span style={{ width: `${aShare}%`, background: colorA }} />
            <span style={{ width: `${100 - aShare}%`, background: colorB }} />
          </div>
          <dl className="h2h-stats">
            <div>
              <dt>Tables as opponents</dt>
              <dd>{record.meetings}</dd>
            </div>
            <div>
              <dt>Placed ahead</dt>
              <dd>
                {record.aAhead} – {record.bAhead}
                {record.ties > 0 && ` (${record.ties} tied)`}
              </dd>
            </div>
            <div>
              <dt>Avg score in those tables</dt>
              <dd>
                {formatScore(record.aAvgScore)} – {formatScore(record.bAvgScore)}
              </dd>
            </div>
            {record.teammates > 0 && (
              <div>
                <dt>As teammates</dt>
                <dd>{record.teammates}</dd>
              </div>
            )}
          </dl>
        </>
      }

      {record.lastTableId != null && (
        <Link className="event-link" to={`/table/${record.lastTableId}`}>
          Last shared table
        </Link>
      )}
    </li>
  );
}

/**
 * Head-to-head records for every pair of compared players, from the tables they
 * both played this season (deleted tables left out).
 */
function HeadToHead({ players, colors }) {
  const pairs = useMemo(() => calculateHeadToHeadPairs(players), [players]);
  const colorOf = (player) => colors[players.indexOf(player)];

  return (
    <div className="player-summary">
      <h3>Head-to-head record</h3>
      <ul className="h2h-list">
        {pairs.map(({ a, b, record }) => (
          <HeadToHeadPair
            key={`${a.playerId}-${b.playerId}`}
            a={a}
            b={b}
            record={record}
            colorA={colorOf(a)}
            colorB={colorOf(b)}
          />
        ))}
      </ul>
    </div>
  );
}

export default HeadToHead;
