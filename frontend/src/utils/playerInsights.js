import { getCountedTableEvents } from "./playerStats";
import { getEventFormat } from "./playerUtils";

// A "win" is an event that gained MMR, matching the API's own winRate.
const isWin = (event) => (event.mmrDelta ?? 0) > 0;

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const numericScores = (values) =>
  values.filter((value) => typeof value === "number" && !Number.isNaN(value));

/**
 * Streaks, recent form and peak MMR for one player's season.
 * @param {Array} events - mmrChanges, newest first (as the API sends them)
 * @returns {{
 *   current: { type: "win"|"loss", length: number }|null,
 *   longestWin: number,
 *   longestLoss: number,
 *   form: Array<"W"|"L">,
 *   peak: { mmr: number, time: string }|null,
 * }}
 */
export function calculateStreaksAndForm(events = []) {
  const counted = getCountedTableEvents(events);

  let current = null;
  for (const event of counted) {
    const type = isWin(event) ? "win" : "loss";
    if (!current) {
      current = { type, length: 1 };
    } else if (current.type === type) {
      current.length += 1;
    } else {
      break;
    }
  }

  let longestWin = 0;
  let longestLoss = 0;
  let run = 0;
  let runType = null;
  // Newest to oldest; direction doesn't change run lengths
  for (const event of counted) {
    const type = isWin(event) ? "win" : "loss";
    run = type === runType ? run + 1 : 1;
    runType = type;
    if (type === "win") longestWin = Math.max(longestWin, run);
    else longestLoss = Math.max(longestLoss, run);
  }

  // Peak over every entry: penalties and refunds move MMR too
  const peakEvent = (Array.isArray(events) ? events : []).reduce(
    (best, event) =>
      typeof event?.newMmr === "number" && (!best || event.newMmr > best.newMmr) ?
        event
      : best,
    null,
  );

  return {
    current,
    longestWin,
    longestLoss,
    form: counted.slice(0, 10).map((event) => (isWin(event) ? "W" : "L")),
    peak: peakEvent ? { mmr: peakEvent.newMmr, time: peakEvent.time } : null,
  };
}

/**
 * Teammates across a player's season, most frequent first.
 * @param {Array} events - mmrChanges
 * @returns {Array<{
 *   playerId: number, events: number, wins: number, winRate: number,
 *   avgScore: number|null, avgPartnerScore: number|null, netMmr: number,
 *   lastTableId: number,
 * }>}
 */
export function calculatePartners(events = []) {
  const byPartner = new Map();

  getCountedTableEvents(events).forEach((event) => {
    const partnerIds = Array.isArray(event.partnerIds) ? event.partnerIds : [];
    partnerIds.forEach((playerId, index) => {
      if (playerId == null) return;
      let partner = byPartner.get(playerId);
      if (!partner) {
        partner = {
          playerId,
          events: 0,
          wins: 0,
          scores: [],
          partnerScores: [],
          netMmr: 0,
          // Newest first, so the first table seen is the most recent shared one
          lastTableId: event.changeId,
        };
        byPartner.set(playerId, partner);
      }
      partner.events += 1;
      if (isWin(event)) partner.wins += 1;
      partner.scores.push(event.score);
      partner.partnerScores.push(event.partnerScores?.[index]);
      partner.netMmr += event.mmrDelta ?? 0;
    });
  });

  return [...byPartner.values()]
    .map(({ scores, partnerScores, ...partner }) => ({
      ...partner,
      winRate: partner.wins / partner.events,
      avgScore: average(numericScores(scores)),
      avgPartnerScore: average(numericScores(partnerScores)),
    }))
    .sort((a, b) => b.events - a.events || b.winRate - a.winRate);
}

/**
 * Head-to-head record between two players in the same season and ladder, from the
 * tables both of them played (deleted tables left out).
 * @param {Object} playerA - player details with playerId and mmrChanges
 * @param {Object} playerB - player details with playerId and mmrChanges
 * @returns {{
 *   meetings: number, aAhead: number, bAhead: number, ties: number,
 *   teammates: number, aAvgScore: number|null, bAvgScore: number|null,
 *   lastTableId: number|null,
 * }}
 */
export function calculateHeadToHead(playerA, playerB) {
  const bTables = new Map(
    getCountedTableEvents(playerB?.mmrChanges).map((event) => [
      event.changeId,
      event,
    ]),
  );

  const result = {
    meetings: 0,
    aAhead: 0,
    bAhead: 0,
    ties: 0,
    teammates: 0,
    aAvgScore: null,
    bAvgScore: null,
    lastTableId: null,
  };
  const aScores = [];
  const bScores = [];

  getCountedTableEvents(playerA?.mmrChanges).forEach((aEvent) => {
    const bEvent = bTables.get(aEvent.changeId);
    if (!bEvent) return;

    result.lastTableId ??= aEvent.changeId;

    const sameTeam =
      Array.isArray(aEvent.partnerIds) &&
      aEvent.partnerIds.includes(playerB.playerId);
    if (sameTeam) {
      result.teammates += 1;
      return;
    }

    result.meetings += 1;
    aScores.push(aEvent.score);
    bScores.push(bEvent.score);
    // rank is the team's placement: lower is better
    if (aEvent.rank < bEvent.rank) result.aAhead += 1;
    else if (bEvent.rank < aEvent.rank) result.bAhead += 1;
    else result.ties += 1;
  });

  result.aAvgScore = average(numericScores(aScores));
  result.bAvgScore = average(numericScores(bScores));
  return result;
}

/**
 * Every pair among the compared players, in the order they were entered.
 * @param {Array} players - player details
 * @returns {Array<{ a: Object, b: Object, record: Object }>}
 */
export function calculateHeadToHeadPairs(players = []) {
  const pairs = [];
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      pairs.push({
        a: players[i],
        b: players[j],
        record: calculateHeadToHead(players[i], players[j]),
      });
    }
  }
  return pairs;
}

// FFA first, then team formats by team size ("2v2" < "3v3" < "6v6")
const formatSortKey = (format) => {
  const match = /(\d+)v\d+/.exec(format);
  return match ? Number(match[1]) : 1;
};

/**
 * Per-tier or per-format results for one player's season (deleted tables left out).
 * @param {Array} events - mmrChanges
 * @param {"tier"|"format"} by - How to group
 * @param {Object} [options]
 * @param {boolean} [options.splitByPlayerCount] - Prefix formats with 12p/24p (for
 *   pre-split seasons, where both player counts share one ladder)
 * @returns {Array<{
 *   key: string, label: string, events: number, wins: number, winRate: number,
 *   avgScore: number|null, avgPlacement: number|null, netMmr: number, share: number,
 * }>} Tiers by most events; formats FFA first then by team size. `share` is
 *   events relative to the largest row (0-1), for bar widths.
 */
export function calculateBreakdown(events = [], by = "tier", options = {}) {
  const groups = new Map();

  getCountedTableEvents(events).forEach((event) => {
    let key;
    if (by === "format") {
      const format = getEventFormat(event.numPlayers, event.numTeams);
      if (!format) return;
      key =
        options.splitByPlayerCount && event.numPlayers ?
          `${event.numPlayers}p ${format}`
        : format;
    } else {
      key = typeof event.tier === "string" ? event.tier.trim() : "";
      if (!key) return;
    }

    let group = groups.get(key);
    if (!group) {
      group = { key, events: 0, wins: 0, scores: [], placements: [], netMmr: 0 };
      groups.set(key, group);
    }
    group.events += 1;
    if (isWin(event)) group.wins += 1;
    group.scores.push(event.score);
    if (Number.isFinite(event.rank)) group.placements.push(event.rank);
    group.netMmr += event.mmrDelta ?? 0;
  });

  const rows = [...groups.values()].map(({ scores, placements, ...group }) => ({
    ...group,
    label: group.key,
    winRate: group.wins / group.events,
    avgScore: average(numericScores(scores)),
    avgPlacement: average(placements),
  }));

  rows.sort((a, b) => {
    if (by === "format") {
      const playerCount = (row) => Number(/^(\d+)p /.exec(row.key)?.[1] ?? 0);
      return (
        playerCount(a) - playerCount(b) ||
        formatSortKey(a.key.replace(/^\d+p /, "")) -
          formatSortKey(b.key.replace(/^\d+p /, ""))
      );
    }
    return b.events - a.events || a.key.localeCompare(b.key);
  });

  const most = Math.max(0, ...rows.map((row) => row.events));
  return rows.map((row) => ({ ...row, share: most ? row.events / most : 0 }));
}
