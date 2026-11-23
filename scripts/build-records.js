// Snapshots the records of finished seasons into server/data/records-archive.json,
// so /api/records serves them without fetching every table of a season (tens of
// MB, 10-30 s upstream) at request time.
//
//   node scripts/build-records.js 0 1 2
//
// Run it for the season that just ended whenever the season is bumped. Seasons
// already in the archive and not named are kept.

const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");
const { computeRecords } = require("../server/records");

const ARCHIVE_PATH = path.join(__dirname, "..", "server", "data", "records-archive.json");
const FIRST_SPLIT_SEASON = 2;
// Mario Kart World's release; no table is older than this
const EARLIEST = Date.parse("2025-06-01T00:00:00Z");
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const gamesFor = (season) =>
  season >= FIRST_SPLIT_SEASON ? ["mkworld24p", "mkworld12p"] : ["mkworld"];

async function getWithRetry(params, attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { data } = await axios.get("https://lounge.mkcentral.com/api/table/list", {
        params,
        timeout: 120000,
      });
      return data;
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.warn(`\nRetrying ${params.game} s${params.season} from ${params.from}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function fetchSeasonTables(game, season) {
  const byId = new Map();
  for (let from = EARLIEST; from < Date.now(); from += WINDOW_MS) {
    const params = {
      game,
      season,
      from: new Date(from).toISOString(),
      to: new Date(from + WINDOW_MS).toISOString(),
    };
    const data = await getWithRetry(params);
    for (const table of data || []) byId.set(table.id, table);
    process.stdout.write(`\r${game} s${season}: ${byId.size} tables`);
  }
  process.stdout.write("\n");
  return [...byId.values()];
}

async function main() {
  const seasons = process.argv.slice(2).map(Number);
  if (seasons.length === 0 || seasons.some((s) => !Number.isInteger(s) || s < 0)) {
    console.error("Usage: node scripts/build-records.js <season> [season...]");
    process.exit(1);
  }

  const archive = fs.existsSync(ARCHIVE_PATH)
    ? JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf8"))
    : {};

  for (const season of seasons) {
    for (const game of gamesFor(season)) {
      const tables = await fetchSeasonTables(game, season);
      archive[`${game}|${season}`] = {
        season,
        game,
        generatedAt: new Date().toISOString(),
        ...computeRecords(tables),
      };
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(archive).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.mkdirSync(path.dirname(ARCHIVE_PATH), { recursive: true });
  fs.writeFileSync(ARCHIVE_PATH, `${JSON.stringify(sorted)}\n`);
  console.log(`Wrote ${ARCHIVE_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
