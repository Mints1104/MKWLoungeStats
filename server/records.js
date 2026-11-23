// Top scores per format and tier, rebuilt from the upstream table list
// (/api/table/list), which is the only source: the Lounge site's Records page has
// no JSON endpoint. Matches that page for FFA: deleted tables are left out and
// equal scores keep the earlier table first.

const RECORDS_PER_TIER = 5;

// Ladder order, highest first; tiers the API adds later sort after these.
const TIER_ORDER = [
  "X",
  "S",
  "A",
  "AB",
  "B",
  "BC",
  "C",
  "CD",
  "D",
  "DE",
  "E",
  "EF",
  "F",
  "FG",
  "G",
  // Seasons 0-1 ran a single tier
  "Q",
  "SQ",
];

const tierIndex = (tier) => {
  const index = TIER_ORDER.indexOf(tier);
  return index === -1 ? TIER_ORDER.length : index;
};

// "FFA" first, then team formats by team size ("2v2" < "3v3" < ... < "12v12")
const formatSize = (format) => {
  if (format === "FFA") return 1;
  const size = Number.parseInt(format, 10);
  return Number.isFinite(size) ? size : Number.MAX_SAFE_INTEGER;
};

const compareRecords = (a, b) =>
  b.score - a.score ||
  String(a.createdOn).localeCompare(String(b.createdOn)) ||
  a.tableId - b.tableId;

// Keeps the best `limit` records in `list`, sorted, without holding every score
const insertRecord = (list, record, limit) => {
  if (list.length === limit && compareRecords(record, list[limit - 1]) >= 0) {
    return;
  }
  let index = list.length;
  while (index > 0 && compareRecords(record, list[index - 1]) < 0) {
    index -= 1;
  }
  list.splice(index, 0, record);
  if (list.length > limit) list.pop();
};

const toPlayer = (score) => ({
  id: score.playerId,
  name: score.playerName,
  countryCode: score.playerCountryCode || null,
});

/**
 * @param {Array} tables - upstream TableDetailsViewModel list for one ladder
 * @param {{ limit?: number }} [options]
 * @returns {{ tableCount: number, formats: Array<{ format: string, tiers: Array<{
 *   tier: string, records: Array<{ score: number, tableId: number,
 *   createdOn: string, players: Array<{ id: number, name: string,
 *   countryCode: string|null }> }> }> }> }}
 *   For FFA each record is one player's score; for team formats it is a team's
 *   combined score.
 */
const computeRecords = (tables, { limit = RECORDS_PER_TIER } = {}) => {
  const byFormat = new Map();
  let tableCount = 0;

  for (const table of Array.isArray(tables) ? tables : []) {
    if (!table || table.deletedOn || !Array.isArray(table.teams)) continue;
    tableCount += 1;

    const format = table.format || "Unknown";
    const tier = table.tier || "Unknown";
    if (!byFormat.has(format)) byFormat.set(format, new Map());
    const tiers = byFormat.get(format);
    if (!tiers.has(tier)) tiers.set(tier, []);
    const list = tiers.get(tier);

    const base = { tableId: table.id, createdOn: table.createdOn };
    for (const team of table.teams) {
      const scores = Array.isArray(team?.scores) ? team.scores : [];
      if (format === "FFA") {
        for (const score of scores) {
          insertRecord(
            list,
            { ...base, score: Number(score.score) || 0, players: [toPlayer(score)] },
            limit,
          );
        }
      } else if (scores.length > 0) {
        const total = scores.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
        insertRecord(
          list,
          { ...base, score: total, players: scores.map(toPlayer) },
          limit,
        );
      }
    }
  }

  const formats = [...byFormat.entries()]
    .sort(([a], [b]) => formatSize(a) - formatSize(b) || a.localeCompare(b))
    .map(([format, tiers]) => ({
      format,
      tiers: [...tiers.entries()]
        .sort(([a], [b]) => tierIndex(a) - tierIndex(b) || a.localeCompare(b))
        .map(([tier, records]) => ({ tier, records })),
    }));

  return { tableCount, formats };
};

module.exports = { computeRecords, RECORDS_PER_TIER, TIER_ORDER };
