const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const axios = require("axios");

process.env.NODE_ENV = "test";

const app = require("../../server");
const { computeRecords } = require("../../server/records");

let nextPlayerId = 1;
const score = (playerName, value) => ({
  score: value,
  playerId: nextPlayerId++,
  playerName,
  playerCountryCode: "GB",
});
const table = (id, fields, teams) => ({
  id,
  format: "FFA",
  tier: "A",
  createdOn: `2026-07-${String(id).padStart(2, "0")}T00:00:00Z`,
  ...fields,
  teams: teams.map((scores, index) => ({ rank: index + 1, scores })),
});

test("computeRecords keeps the top FFA scores per tier, earlier table first on ties", () => {
  const tables = [
    table(2, {}, [[score("Late", 120)], [score("Low", 80)]]),
    table(1, {}, [[score("Early", 120)], [score("Mid", 100)]]),
    table(3, { tier: "X" }, [[score("Top", 130)]]),
  ];

  const { tableCount, formats } = computeRecords(tables, { limit: 3 });

  assert.equal(tableCount, 3);
  assert.equal(formats.length, 1);
  assert.deepEqual(
    formats[0].tiers.map((t) => t.tier),
    ["X", "A"],
  );
  assert.deepEqual(
    formats[0].tiers[1].records.map((r) => [r.players[0].name, r.score, r.tableId]),
    [
      ["Early", 120, 1],
      ["Late", 120, 2],
      ["Mid", 100, 1],
    ],
  );
});

test("computeRecords skips deleted tables", () => {
  const { tableCount, formats } = computeRecords([
    table(1, { deletedOn: "2026-07-02T00:00:00Z" }, [[score("Gone", 150)]]),
    table(2, {}, [[score("Kept", 90)]]),
  ]);

  assert.equal(tableCount, 1);
  assert.deepEqual(
    formats[0].tiers[0].records.map((r) => r.players[0].name),
    ["Kept"],
  );
});

test("computeRecords sums team scores and orders formats by team size", () => {
  const { formats } = computeRecords([
    table(1, { format: "3v3" }, [
      [score("A", 50), score("B", 40), score("C", 30)],
      [score("D", 20), score("E", 20), score("F", 20)],
    ]),
    table(2, { format: "2v2" }, [[score("G", 70), score("H", 60)]]),
    table(3, {}, [[score("I", 100)]]),
  ]);

  assert.deepEqual(
    formats.map((f) => f.format),
    ["FFA", "2v2", "3v3"],
  );
  const best3v3 = formats[2].tiers[0].records[0];
  assert.equal(best3v3.score, 120);
  assert.deepEqual(
    best3v3.players.map((p) => p.name),
    ["A", "B", "C"],
  );
});

test("GET /api/records rejects a game that does not match the season", async () => {
  const response = await request(app).get("/api/records?season=1&game=mkworld24p");
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Seasons before 2 use game mkworld");
});

test("GET /api/records rejects seasons that have not started", async () => {
  const response = await request(app).get("/api/records?season=99&game=mkworld24p");
  assert.equal(response.status, 400);
});

test("GET /api/records computes the current season from the table list and caches it", async (t) => {
  const mock = t.mock.method(axios, "get", async (url, config) => {
    assert.match(String(url), /\/api\/table\/list$/);
    assert.deepEqual(config.params, { game: "mkworld12p", season: 3 });
    return { data: [table(1, {}, [[score("Live", 111)]])] };
  });

  const first = await request(app).get("/api/records?season=3&game=mkworld12p");
  const second = await request(app).get("/api/records?season=3&game=mkworld12p");

  assert.equal(first.status, 200);
  assert.equal(first.body.season, 3);
  assert.equal(first.body.game, "mkworld12p");
  assert.equal(first.body.formats[0].tiers[0].records[0].score, 111);
  assert.equal(
    first.headers["cache-control"],
    "public, s-maxage=1800, stale-while-revalidate=86400",
  );
  assert.deepEqual(second.body, first.body);
  assert.equal(mock.mock.callCount(), 1);
});

test("GET /api/records reports an upstream timeout as 504 without caching", async (t) => {
  t.mock.method(axios, "get", async () => {
    const error = new axios.AxiosError("timeout", "ECONNABORTED");
    throw error;
  });

  const response = await request(app).get("/api/records?season=3&game=mkworld24p");
  assert.equal(response.status, 504);
  assert.equal(response.headers["cache-control"], undefined);
});

test("GET /api/records serves finished seasons from the archive without calling upstream", async (t) => {
  const mock = t.mock.method(axios, "get", async () => {
    throw new Error("upstream should not be called");
  });

  const response = await request(app).get("/api/records?season=2&game=mkworld24p");

  assert.equal(response.status, 200);
  assert.equal(response.body.season, 2);
  assert.ok(response.body.formats.some((f) => f.format === "FFA"));
  assert.match(response.headers["cache-control"], /s-maxage=86400/);
  assert.equal(mock.mock.callCount(), 0);
});
