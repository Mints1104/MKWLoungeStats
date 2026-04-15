const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

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
