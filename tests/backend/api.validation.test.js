const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const axios = require("axios");

process.env.NODE_ENV = "test";

const app = require("../../server");

test("GET /api/table/:tableid rejects non-numeric table IDs", async () => {
  const response = await request(app).get("/api/table/not-a-number");

  assert.equal(response.status, 400);
  assert.equal(
    response.body.error,
    "Table ID must be a numeric value up to 10 digits",
  );
});

test("GET /api/player/details/:name rejects empty names", async () => {
  const response = await request(app).get("/api/player/details/%20");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Player name cannot be empty");
});

test("GET /api/player/stats requires season", async () => {
  const response = await request(app).get("/api/player/stats?game=mkworld");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Season is required");
});

test("GET /api/players/compare requires between 1 and 4 names", async () => {
  const response = await request(app).get("/api/players/compare");

  assert.equal(response.status, 400);
  assert.equal(
    response.body.error,
    "Please provide 1-4 player names separated by commas",
  );
});

test("GET /api/table:tableid returns table data on valid id", async (t) => {
  const fakeTable = { tableid: "12345" };
  t.mock.method(axios, "get", async () => ({ data: fakeTable }));
  const response = await request(app).get("/api/table/123345");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, fakeTable);
});

test("GET /api/player/details/:name defaults to season 3", async (t) => {
  t.mock.method(axios, "get", async (url) => {
    assert.match(String(url), /season=3/);
    return { data: { name: "SomePlayer" } };
  });

  const response = await request(app).get(
    "/api/player/details/SomePlayer?game=mkworld24p",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { name: "SomePlayer" });
});

test("GET /api/leaderboard defaults to season 3", async (t) => {
  t.mock.method(axios, "get", async (url) => {
    assert.match(String(url), /season=3/);
    return { data: { data: [], totalPlayers: 0 } };
  });

  const response = await request(app).get("/api/leaderboard?game=mkworld24p");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    data: [],
    totalCount: 0,
    totalPlayers: 0,
  });
});

const upstreamError = (status) =>
  new axios.AxiosError(
    `Request failed with status code ${status}`,
    "ERR_BAD_RESPONSE",
    undefined,
    undefined,
    { status, data: {} },
  );

test("GET /api/players/compare returns players in the requested order", async (t) => {
  t.mock.method(axios, "get", async (url, config) => ({
    data: { name: config.params.name },
  }));

  const response = await request(app).get(
    "/api/players/compare?names=Zed,Amy,Mid&game=mkworld24p",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.map((player) => player.name),
    ["Zed", "Amy", "Mid"],
  );
});

test("GET /api/player/details/:name keeps other players cached after a 404", async (t) => {
  let cachedPlayerCalls = 0;
  t.mock.method(axios, "get", async (url) => {
    if (String(url).includes("MissingPlayer")) {
      throw upstreamError(404);
    }
    cachedPlayerCalls += 1;
    return { data: { name: "CachePlayer" } };
  });

  await request(app).get("/api/player/details/CachePlayer?game=mkworld24p");
  const missing = await request(app).get(
    "/api/player/details/MissingPlayer?game=mkworld24p",
  );
  const again = await request(app).get(
    "/api/player/details/CachePlayer?game=mkworld24p",
  );

  assert.equal(missing.status, 404);
  assert.equal(again.status, 200);
  assert.equal(cachedPlayerCalls, 1);
});

test("GET /api/leaderboard rejects non-numeric pageSize", async () => {
  const response = await request(app).get(
    "/api/leaderboard?game=mkworld24p&pageSize=abc",
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "pageSize must be a non-negative integer");
});

test("GET /api/leaderboard rejects unsupported sortBy", async () => {
  const response = await request(app).get(
    "/api/leaderboard?game=mkworld24p&sortBy=password",
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Unsupported sortBy value");
});

test("GET /api/leaderboard rejects invalid country codes", async () => {
  const response = await request(app).get(
    "/api/leaderboard?game=mkworld24p&country=USA",
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Country must be a 2-letter country code");
});

test("GET /api/leaderboard clamps pageSize and normalizes params", async (t) => {
  let upstreamParams;
  t.mock.method(axios, "get", async (url, config) => {
    upstreamParams = config.params;
    return { data: { data: [], totalPlayers: 0 } };
  });

  const response = await request(app).get(
    "/api/leaderboard?game=mkworld12p&pageSize=500&skip=100&country=us&sortBy=maxMmr&minMmr=8000",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(upstreamParams, {
    skip: 100,
    pageSize: 100,
    sortBy: "maxMmr",
    minMmr: 8000,
    country: "US",
  });
});

test("GET /api/leaderboard passes through upstream error status", async (t) => {
  t.mock.method(axios, "get", async () => {
    throw upstreamError(503);
  });

  const response = await request(app).get(
    "/api/leaderboard?game=mkworld24p&season=2",
  );

  assert.equal(response.status, 503);
});

test("GET /api/player/leaderboard/:name returns 404 when upstream has no data array", async (t) => {
  t.mock.method(axios, "get", async () => ({ data: {} }));

  const response = await request(app).get(
    "/api/player/leaderboard/NoDataPlayer?game=mkworld24p",
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Player not found");
});

test("successful responses are cacheable by the CDN", async (t) => {
  t.mock.method(axios, "get", async () => ({ data: { id: 987 } }));

  const fresh = await request(app).get("/api/table/987");
  const cached = await request(app).get("/api/table/987");

  for (const response of [fresh, cached]) {
    assert.equal(response.status, 200);
    assert.equal(
      response.headers["cache-control"],
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  }
});

test("player details and stats use the longer CDN TTL", async (t) => {
  t.mock.method(axios, "get", async () => ({ data: { name: "TtlPlayer" } }));

  const response = await request(app).get(
    "/api/player/details/TtlPlayer?game=mkworld24p",
  );

  assert.equal(
    response.headers["cache-control"],
    "public, s-maxage=120, stale-while-revalidate=600",
  );
});

test("error responses are not cacheable", async (t) => {
  t.mock.method(axios, "get", async () => {
    throw upstreamError(404);
  });

  const invalid = await request(app).get("/api/table/not-a-number");
  const missing = await request(app).get("/api/table/404404");

  assert.equal(invalid.status, 400);
  assert.equal(missing.status, 404);
  assert.equal(invalid.headers["cache-control"], undefined);
  assert.equal(missing.headers["cache-control"], undefined);
});

test("GET /api/players/compare keeps the requested order on a cache hit", async (t) => {
  t.mock.method(axios, "get", async (url, config) => ({
    data: { name: config.params.name },
  }));

  await request(app).get("/api/players/compare?names=Ann,Bo&game=mkworld24p");
  const reversed = await request(app).get(
    "/api/players/compare?names=Bo,Ann&game=mkworld24p",
  );

  assert.deepEqual(
    reversed.body.map((player) => player.name),
    ["Bo", "Ann"],
  );
});

test("GET /api/players/compare does not cache a transient upstream failure", async (t) => {
  let flakyCalls = 0;
  t.mock.method(axios, "get", async (url, config) => {
    if (config.params.name === "Flaky") {
      flakyCalls += 1;
      if (flakyCalls === 1) throw upstreamError(503);
    }
    return { data: { name: config.params.name } };
  });

  const first = await request(app).get(
    "/api/players/compare?names=Steady,Flaky&game=mkworld24p",
  );
  const second = await request(app).get(
    "/api/players/compare?names=Steady,Flaky&game=mkworld24p",
  );

  assert.equal(first.body[1].error, true);
  assert.equal(first.headers["cache-control"], undefined);
  assert.deepEqual(second.body[1], { name: "Flaky" });
});

test("CORS preflight only allows GET and no credentials", async () => {
  const response = await request(app)
    .options("/api/leaderboard")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(response.headers["access-control-allow-methods"], "GET");
  assert.equal(response.headers["access-control-allow-credentials"], undefined);
});
