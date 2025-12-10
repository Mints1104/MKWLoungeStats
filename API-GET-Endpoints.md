# Lounge API – GET Endpoint Cheat Sheet

> Note: This document only covers **GET** endpoints. POST/DELETE endpoints are omitted since they require elevated permissions.

Base URL examples:

- Production / live: `https://<host>`
- API base: `https://<host>/api`

---

## Players (`/api/player`)

### `GET /api/player`

Look up a player for a specific game/season.

**Query parameters** (one identifier is required):

- `name` – player name
- `id` – internal player ID
- `mkcId` – MKCentral / registry ID
- `discordId` – Discord user ID
- `fc` – Switch friend code

**Optional:**

- `game` – game ID (e.g. `mk8dx`, `mkworld`; default `mk8dx`)
- `season` – season number (default = current season for that game)

---

### `GET /api/player/allgames`

Basic player info + list of games they are registered in.

**Query parameters** (one identifier is required):

- `name` | `id` | `mkcId` | `discordId` | `fc`

---

### `GET /api/player/details`

Detailed stats and events (via `mmrChanges`) for a single game/season.

**Query parameters**:

- One of: `name` | `id` | `discordId` | `fc`
- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

**Notes:**

- Response type: `PlayerDetailsViewModel`.
- `EventsPlayed` is the total number of events.
- `MmrChanges` is the event history:
  - Entries with `"reason": "Table"` represent **tables/events played**.
  - Each such entry contains:
    - `changeId` – **table ID** for the event.
    - `time` – when the table was verified.
    - `score` – that player’s score in the event.
    - `tier`, `numTeams`, `numPlayers`, `partnerIds`, `partnerScores`, etc.
  - To fetch full event details (all players and scores), call:
    - `GET /api/table?tableId=<changeId>`.

Example (MKWorld):

```http
GET /api/player/details?name=SomePlayer&game=mkworld&season=12
```

---

### `GET /api/player/list`

List players with basic stats for a game/season.

**Query parameters**:

- `minMmr` – minimum MMR (optional)
- `maxMmr` – maximum MMR (optional)
- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

Response type: `PlayerListViewModel` (players + `EventsPlayed`, MMR, etc.).

---

### `GET /api/player/leaderboard`

Paged leaderboard for a game/season with filters.

**Query parameters**:

- `season` – season number (required)
- `game` – game ID (default `mk8dx`)
- `sortBy` – sort order (e.g. `Mmr`)
- `skip` – number of players to skip (for paging)
- `pageSize` – number of players per page (max 100)
- Filters (all optional):
  - `search` – supports:
    - `mkc=<id>`
    - `discord=<id>`
    - `switch=<fc>`
    - or fuzzy match on normalized name
  - `country` – 2-letter country code
  - `minMmr`, `maxMmr`
  - `minEventsPlayed`, `maxEventsPlayed`
  - `minCreationDateUtc`, `maxCreationDateUtc` (ISO datetimes)

Response type: `LeaderboardViewModel`.

---

### `GET /api/player/listPendingNameChanges`

List of all players with a pending name change request.

- Requires authentication.

---

### `GET /api/player/stats`

Global stats for a game/season (distributions, activity, etc.).

**Query parameters**:

- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

Response type: `StatsViewModel`.

---

## Tables (`/api/table`)

### `GET /api/table`

Get full details for a single table/event.

**Query parameters**:

- `tableId` – ID of the table/event

Response type: `TableDetailsViewModel`.

**Typical use with player events:**

1. Call `GET /api/player/details` to get `MmrChanges`.
2. For each event (`reason == "Table"`), take `changeId`.
3. Call `GET /api/table?tableId=<changeId>` to see all players, scores, ranks, etc.

---

### `GET /api/table/list`

List tables in a time range for a given game/season.

**Query parameters**:

- `from` – start time (ISO datetime, required)
- `to` – end time (ISO datetime, optional)
- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

Response: `List<TableDetailsViewModel>`.

---

### `GET /api/table/unverified`

List unverified, non-deleted tables for a game/season.

**Query parameters**:

- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

Response: `List<TableDetailsViewModel>`.

---

## Bonuses (`/api/bonus`)

### `GET /api/bonus`

Get a single bonus by ID.

**Query parameters**:

- `id` – bonus ID

Response type: `BonusViewModel`.

---

### `GET /api/bonus/list`

List bonuses for a player in a given game/season.

**Query parameters**:

- `name` – player name
- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

Response: `List<BonusViewModel>`.

---

## Penalties (`/api/penalty`)

### `GET /api/penalty`

Get a single penalty by ID.

**Query parameters**:

- `id` – penalty ID

Response type: `PenaltyViewModel`.

---

### `GET /api/penalty/list`

List penalties for a player with filters.

**Query parameters**:

- `name` – player name
- `isStrike` – filter by strikes only / non-strikes (`true`/`false`, optional)
- `from` – only penalties on/after this datetime (optional)
- `includeDeleted` – include deleted penalties (default `false`)
- `game` – game ID (default `mk8dx`)
- `season` – season number (default = current for that game)

Response: `List<PenaltyViewModel>`.

---

## Penalty Requests (`/api/penaltyrequest`)

### `GET /api/penaltyrequest`

Get a single penalty request by ID.

**Query parameters**:

- `id` – request ID
- `game` – game ID (default `mk8dx`)

Response type: `PenaltyRequestViewModel`.

---

### `GET /api/penaltyrequest/list`

List all penalty requests for a given game.

**Query parameters**:

- `game` – game ID (default `mk8dx`)

Response: `List<PenaltyRequestViewModel>`.

---

## Other Useful GET Routes (Non-API)

### `GET /TableImage/{id}.png`

Returns a PNG image for a table.

- `{id}` – table ID

Typical flow:

1. Get table details: `GET /api/table?tableId=12345`.
2. Get image: `GET /TableImage/12345.png`.

---

## Common MKWorld Examples

Replace `<host>` and `<playerName>` as needed.

- Get MKWorld player details + events (current season):

  ```http
  GET https://<host>/api/player/details?name=<playerName>&game=mkworld
  ```

- Get full table details for one of that players events:

  ```http
  GET https://<host>/api/table?tableId=<changeId-from-mmrChanges>
  ```

- Get MKWorld leaderboard for a season (page 1, 50 per page):

  ```http
  GET https://<host>/api/player/leaderboard?season=12&game=mkworld&skip=0&pageSize=50
  ```
