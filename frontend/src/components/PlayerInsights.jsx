import { useId, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  calculatePartners,
  calculateStreaksAndForm,
} from "../utils/playerInsights";
import { formatWinRate, winRateClassName } from "../utils/playerUtils";
import { getProfilePath } from "../utils/playerLinks";
import { usePartnerNames } from "../hooks/usePartnerNames";
import StatCard from "./StatCard";

const TOP_PARTNERS = 5;

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function formatStreak(streak) {
  if (!streak) return "N/A";
  return `${streak.length} ${streak.type === "win" ? "win" : "loss"}${
    streak.length === 1 ? ""
    : streak.type === "win" ? "s"
    : "es"
  }`;
}

/**
 * Form, streaks, peak MMR and most frequent teammates for one player's season.
 * Wins are events that gained MMR; deleted tables are left out.
 */
function PlayerInsights({ events, season, mmrType }) {
  const { current, longestWin, longestLoss, form, peak } = useMemo(
    () => calculateStreaksAndForm(events),
    [events],
  );
  const partners = useMemo(
    () => calculatePartners(events).slice(0, TOP_PARTNERS),
    [events],
  );
  const partnerNames = usePartnerNames(partners);
  const formLabelId = useId();
  const formOrderId = useId();

  if (!form.length) return null;

  return (
    <div className="player-summary insights-card">
      <h3>Form and streaks</h3>

      <div className="form-row">
        <span className="recent-stat-label" id={formLabelId}>
          Last {form.length}
        </span>
        <ol
          className="form-chips"
          aria-labelledby={formLabelId}
          aria-describedby={formOrderId}
        >
          {form.map((result, index) => (
            <li
              key={index}
              className={`form-chip ${result === "W" ? "form-chip-win" : "form-chip-loss"}`}
            >
              <span aria-hidden="true">{result}</span>
              <span className="sr-only">{result === "W" ? "Win" : "Loss"}</span>
            </li>
          ))}
        </ol>
        <span className="form-order" id={formOrderId}>
          newest first
        </span>
      </div>

      <div className="recent-stats-row">
        <StatCard
          label="Current streak"
          value={formatStreak(current)}
          valueClassName={current?.type === "win" ? "positive" : "negative"}
        />
        <StatCard
          label="Longest win streak"
          value={longestWin}
          valueClassName="positive"
        />
        <StatCard
          label="Longest loss streak"
          value={longestLoss}
          valueClassName="negative"
        />
        {peak && (
          <StatCard
            label={`Peak MMR${peak.time ? ` (${formatDate(peak.time)})` : ""}`}
            value={peak.mmr}
          />
        )}
      </div>

      {partners.length > 0 && (
        <>
          <h4 className="insights-subheading">Most frequent partners</h4>
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table partners-table">
              <caption className="sr-only">
                Teammates this season, with results when playing together
              </caption>
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Events</th>
                  <th>Win rate</th>
                  <th>Your avg</th>
                  <th>Their avg</th>
                  <th>Net MMR</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => {
                  const name = partnerNames[partner.playerId];
                  return (
                    <tr key={partner.playerId}>
                      <td>
                        {name ?
                          <Link
                            className="leaderboard-name"
                            to={getProfilePath(name, season, mmrType)}
                          >
                            {name}
                          </Link>
                        : <span className="partner-pending">
                            Player #{partner.playerId}
                          </span>
                        }
                      </td>
                      <td>{partner.events}</td>
                      <td className={winRateClassName(partner.winRate)}>
                        {formatWinRate(partner.winRate, 1)}
                      </td>
                      <td>
                        {partner.avgScore != null ?
                          partner.avgScore.toFixed(1)
                        : "N/A"}
                      </td>
                      <td>
                        {partner.avgPartnerScore != null ?
                          partner.avgPartnerScore.toFixed(1)
                        : "N/A"}
                      </td>
                      <td
                        className={
                          partner.netMmr > 0 ? "positive"
                          : partner.netMmr < 0 ?
                            "negative"
                          : ""
                        }
                      >
                        {partner.netMmr > 0 ? `+${partner.netMmr}` : partner.netMmr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default PlayerInsights;
