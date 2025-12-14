export function formatTimeAgo(dateInput) {
  const ms =
    typeof dateInput === "number"
      ? dateInput.toString().length === 10
        ? dateInput * 1000
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

export function getNextRank(mmr) {
  const ranks = [
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
