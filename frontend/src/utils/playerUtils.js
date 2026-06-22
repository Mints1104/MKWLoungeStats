/**
 * Formats a timestamp into a relative "time ago" string.
 * @param {number|string|Date} dateInput - Timestamp, date string, or Date object.
 * @returns {string} Relative time string (e.g., "5m ago").
 */
export function formatTimeAgo(dateInput) {
  const ms =
    typeof dateInput === "number" ?
      dateInput.toString().length === 10 ?
        dateInput * 1000
      : dateInput
    : new Date(dateInput).getTime();

  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/**
 * Retrieves the rank thresholds for a specific season and MMR type.
 * @param {number} season - Season number.
 * @param {number} mmrType - MMR type (12 or 24).
 * @returns {Array} Array of rank threshold objects.
 */
export function getThresholds(season, mmrType) {
  if (Number(season) < 2) {
    return RANK_THRESHOLDS;
  }
  if (Number(mmrType) !== 12) {
    return RANK_THRESHOLDS_24P;
  }
  return Number(season) >= 3 ?
      RANK_THRESHOLDS_12P_SEASON_3
    : RANK_THRESHOLDS_12P_SEASON_2;
}

/**
 * Calculates the MMR required to reach the next rank.
 * @param {number} mmr - Current MMR.
 * @param {number} season - Season number.
 * @param {number} mmrType - MMR type.
 * @returns {string} Message indicating MMR needed for next rank.
 */
export function getNextRank(mmr, season, mmrType) {
  const ranks = getThresholds(season, mmrType);

  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i];
    if (mmr <= rank.max) {
      const nextRank = ranks[i + 1];
      if (!nextRank) {
        return "";
      }
      const mmrToNextRank = nextRank.min - mmr;
      return `${mmrToNextRank} MMR away from ${nextRank.name}`;
    }
  }

  return "";
}

/**
 * Returns the color code associated with a specific rank.
 * @param {string} rank - Rank name.
 * @returns {string} Hex color code.
 */
export function getRankColor(rank) {
  if (!rank) return "#e5e7eb";

  const normalized = rank.toLowerCase();
  switch (normalized) {
    case "grandmaster":
      return "#A3022C";
    case "master":
      return "#9370DB";
    case "diamond":
      return "#B9F2FF";
    case "ruby":
      return "#D51C5E";
    case "sapphire":
      return "#286CD3";
    case "platinum":
      return "#3FABB8";
    case "gold":
      return "#F1C232";
    case "silver":
      return "#CCCCCC";
    case "bronze":
      return "#B45F06";
    case "iron":
      return "#817876";
    default:
      return "#e5e7eb";
  }
}

export const RANK_THRESHOLDS = [
  { name: "Iron", min: 0, max: 1999 },
  { name: "Bronze", min: 2000, max: 3499 },
  { name: "Silver", min: 3500, max: 4999 },
  { name: "Gold", min: 5000, max: 6499 },
  { name: "Platinum", min: 6500, max: 7999 },
  { name: "Sapphire", min: 8000, max: 9499 },
  { name: "Ruby", min: 9500, max: 10999 },
  { name: "Diamond", min: 11000, max: 12499 },
  { name: "Master", min: 12500, max: 13499 },
  { name: "Grandmaster", min: 13500, max: Infinity },
];

export const RANK_THRESHOLDS_12P_SEASON_2 = [
  { name: "Iron", min: 0, max: 1999 },
  { name: "Bronze", min: 2000, max: 3999 },
  { name: "Silver", min: 4000, max: 5999 },
  { name: "Gold", min: 6000, max: 7499 },
  { name: "Platinum", min: 7500, max: 8999 },
  { name: "Sapphire", min: 9000, max: 10499 },
  { name: "Ruby", min: 10500, max: 11999 },
  { name: "Diamond", min: 12000, max: 13499 },
  { name: "Master", min: 13500, max: 14499 },
  { name: "Grandmaster", min: 14500, max: Infinity },
];

export const RANK_THRESHOLDS_12P_SEASON_3 = [
  { name: "Iron", min: 0, max: 1999 },
  { name: "Bronze", min: 2000, max: 3999 },
  { name: "Silver", min: 4000, max: 5999 },
  { name: "Gold", min: 6000, max: 7999 },
  { name: "Platinum", min: 8000, max: 9499 },
  { name: "Sapphire", min: 9500, max: 10999 },
  { name: "Ruby", min: 11000, max: 12499 },
  { name: "Diamond", min: 12500, max: 13999 },
  { name: "Master", min: 14000, max: 14999 },
  { name: "Grandmaster", min: 15000, max: Infinity },
];

export const RANK_THRESHOLDS_24P = [
  { name: "Iron", min: 0, max: 1999 },
  { name: "Bronze", min: 2000, max: 3999 },
  { name: "Silver", min: 4000, max: 5999 },
  { name: "Gold", min: 6000, max: 7999 },
  { name: "Platinum", min: 8000, max: 9999 },
  { name: "Sapphire", min: 10000, max: 11499 },
  { name: "Ruby", min: 11500, max: 12999 },
  { name: "Diamond", min: 13000, max: 14499 },
  { name: "Master", min: 14500, max: 15499 },
  { name: "Grandmaster", min: 15500, max: Infinity },
];

/**
 * Determines the rank name and color for a given MMR value.
 * @param {number} mmr - MMR value.
 * @param {number} season - Season number.
 * @param {number} mmrType - MMR type.
 * @returns {Object} Object containing rank name and color.
 */
export function getRankForMmrValue(mmr, season, mmrType) {
  if (mmr == null || Number.isNaN(Number(mmr))) {
    return { name: null, color: "#38bdf8" };
  }

  const numericMmr = Number(mmr);
  const thresholds = getThresholds(season, mmrType);
  const threshold = thresholds.find(
    (rank) => numericMmr >= rank.min && numericMmr <= rank.max,
  );

  if (!threshold) {
    return { name: null, color: "#38bdf8" };
  }

  return {
    name: threshold.name,
    color: getRankColor(threshold.name),
  };
}

/**
 * Returns a string representation of the event format.
 * @param {number} numPlayers - Number of players.
 * @param {number} numTeams - Number of teams.
 * @returns {string} Format string (e.g., "FFA", "2v2").
 */
export function getEventFormat(numPlayers, numTeams) {
  if (!numPlayers || !numTeams) return "";
  if (numPlayers === numTeams) return "FFA";

  const teamSize = Math.floor(numPlayers / numTeams);
  return `${teamSize}v${teamSize}`;
}
