import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loungeApi } from "./api/loungeApi";
import PageHeader from "./components/PageHeader";
import SeasonSelector from "./components/SeasonSelector";
import MMRSelector from "./components/MMRSelector";
import FilterToggle from "./components/FilterToggle";
import Flag from "./components/CountryFlag";
import { useSettings } from "./context/settingsContext";
import { useSeasonMmrSelection } from "./hooks/useSeasonMmrSelection";
import { useAbortableRequest } from "./hooks/useAbortableRequest";
import { CURRENT_SEASON } from "./config/seasons";
import { getProfilePath } from "./utils/playerLinks";
import { getPlaceLabel, getTierLabel, pickFormat } from "./utils/records";

const DEFAULT_FORMAT = "FFA";

function formatUpdatedAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function RecordPlayers({ players, season, mmrType }) {
  return (
    <ul className="records-players">
      {players.map((player) => (
        <li key={player.id ?? player.name}>
          {player.countryCode && (
            <Flag
              code={player.countryCode}
              className="flag-icon-small inline-flag"
              aria-label={`Flag of ${player.countryCode}`}
            />
          )}
          <Link
            className="leaderboard-name"
            to={getProfilePath(player.name, season, mmrType)}
          >
            {player.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TierRecords({ tier, records, isTeamFormat, season, mmrType }) {
  const headingId = `records-tier-${tier}`;
  return (
    <section className="records-tier-card" aria-labelledby={headingId}>
      <h3 id={headingId} className="records-tier-title">
        {getTierLabel(tier)}
      </h3>
      {records.length === 0 ?
        <p className="records-empty">No tables yet.</p>
      : <table className="records-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Place</span>
              </th>
              <th scope="col">{isTeamFormat ? "Team" : "Player"}</th>
              <th scope="col" className="records-score-col">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={`${record.tableId}-${record.players[0]?.id ?? index}`}>
                <td className="records-place">
                  {index < 3 ?
                    <span role="img" aria-label={`Place ${index + 1}`}>
                      {getPlaceLabel(index)}
                    </span>
                  : getPlaceLabel(index)}
                </td>
                <td>
                  <RecordPlayers
                    players={record.players}
                    season={season}
                    mmrType={mmrType}
                  />
                </td>
                <td className="records-score-col">
                  <Link
                    className="records-score"
                    to={`/table/${record.tableId}`}
                    aria-label={`${record.score} points, open table ${record.tableId}`}
                  >
                    {record.score}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </section>
  );
}

function Records() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { defaultGameMode } = useSettings();
  const { season, setSeason, setSelectedMmrType, mmrType } =
    useSeasonMmrSelection({
      initialSeason: () => {
        const param = searchParams.get("season");
        return param ? Number(param) : CURRENT_SEASON;
      },
      initialMmrType: () => {
        const param = searchParams.get("mmrType");
        return param ? Number(param) : null;
      },
      defaultMmrType: defaultGameMode,
    });
  const [format, setFormat] = useState(
    () => searchParams.get("format") || DEFAULT_FORMAT,
  );
  const [records, setRecords] = useState(null);
  const { loading, error, run } = useAbortableRequest();

  useEffect(() => {
    const params = new URLSearchParams();
    if (season !== CURRENT_SEASON) params.set("season", season);
    if (season >= 2 && mmrType !== defaultGameMode) {
      params.set("mmrType", mmrType);
    }
    if (format !== DEFAULT_FORMAT) params.set("format", format);
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [season, mmrType, format, defaultGameMode, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    async function fetchRecords() {
      setRecords(null);
      const data = await run(
        (signal) => loungeApi.getRecords(season, mmrType, signal),
        { mapError: (err) => err.message || "Failed to load records" },
      );
      if (active && data) setRecords(data);
    }
    fetchRecords();
    return () => {
      active = false;
    };
  }, [season, mmrType, run]);

  const shown = pickFormat(records, format);
  const isTeamFormat = shown != null && shown.format !== "FFA";
  const formatOptions = (records?.formats ?? []).map((f) => ({
    value: f.format,
    label: f.format,
  }));
  const updatedAt = records?.generatedAt && formatUpdatedAt(records.generatedAt);

  return (
    <div className="player-info-page">
      <div className="player-card">
        <div className="records-header">
          <PageHeader
            title="Records"
            subtitle="The highest scores in a single event, for each format and tier."
          />
          <div className="records-selectors">
            <SeasonSelector selectedSeason={season} onSeasonChange={setSeason} />
            {season >= 2 && (
              <MMRSelector
                selectedMMR={mmrType}
                onMMRChange={setSelectedMmrType}
              />
            )}
          </div>
        </div>

        {formatOptions.length > 1 && (
          <FilterToggle
            activeFilter={shown?.format}
            onFilterChange={setFormat}
            options={formatOptions}
            ariaLabel="Format"
          />
        )}

        {records && (
          <p className="records-meta">
            {isTeamFormat ?
              "Team scores are the team's combined points. "
            : ""}
            Built from {records.tableCount.toLocaleString()} tables
            {season === CURRENT_SEASON && updatedAt ?
              `, updated ${updatedAt}.`
            : "."}
          </p>
        )}

        {error && (
          <p className="player-error" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {loading && (
          <div
            className="loading-skeleton"
            aria-live="polite"
            aria-label="Loading records"
          >
            <p className="records-loading-note">
              Records are rebuilt from every table of the season, so this can
              take up to half a minute.
            </p>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        )}
      </div>

      {records && !shown && (
        <div className="player-card">
          <p className="records-empty">No tables were played on this ladder.</p>
        </div>
      )}

      {shown && (
        <div className="records-grid">
          {shown.tiers.map(({ tier, records: tierRecords }) => (
            <TierRecords
              key={tier}
              tier={tier}
              records={tierRecords}
              isTeamFormat={isTeamFormat}
              season={season}
              mmrType={mmrType}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Records;
