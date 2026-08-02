# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Mario Kart World Lounge Stats** — a stats site for the MKCentral Lounge ladder. An Express
backend at the repo root proxies the upstream Lounge API; a Vite/React SPA in `frontend/`
renders it. Deployed to Vercel (backend as a serverless function, frontend as a static build).

Two independent packages, **not** a workspace monorepo — root `package.json` and
`frontend/package.json` have separate dependency trees and lockfiles.

**Plain JavaScript throughout. No TypeScript, no type definitions, no path aliases.**

```
server.js                 the entire backend API (routes, validation, cache, CORS)
server/utils/logger.js
api/index.js              Vercel entry — just `module.exports = require("../server")`
tests/backend/            backend tests
API-GET-Endpoints.md      cheat sheet for the upstream MKCentral Lounge API
frontend/src/             React SPA
```

## Commands

Root (backend), CommonJS:

```bash
npm run dev     # nodemon server.js  -> http://localhost:3000
npm start       # node server.js
npm test        # node --test tests/backend/api.validation.test.js
```

`frontend/` (ESM):

```bash
npm run dev     # vite -> http://localhost:5173
npm run lint    # eslint . (frontend only — backend has no lint step)
npm test        # vitest (watch mode locally; CI sets CI=true for a single run)
npm run build
```

**Local dev needs both servers running.** Vite proxies `/api` to `http://localhost:3000`
(`frontend/vite.config.js`).

The root `test` script names **one specific file**. Adding a backend test file means editing
that script too. CI (`.github/workflows/ci.yml`) runs: `node --check` on `server.js` and
`api/index.js`, backend tests, frontend lint, frontend tests, frontend build.

## Backend

`server.js` is the whole API in one file. There is **no database** — it is a caching proxy
over `https://lounge.mkcentral.com/api`, called with axios.

Routes: `/api/table/:tableid`, `/api/player/stats`, `/api/player/details/:name`,
`/api/player/leaderboard/:name`, `/api/players/compare?names=a,b,c`, `/api/leaderboard`.

Conventions:

- Validators (`validatePlayerName`, `validateSeason`, `validateGame`, `validateTableId`)
  return `{ valid, sanitized }` or `{ valid, error }`. Follow that shape for new ones.
- In-memory `Map` cache, 60s default TTL (2× for player details/stats), 1000-entry FIFO cap,
  `invalidateCache(prefix)` on error paths. Per-serverless-instance, so best-effort in prod.
- `helmet`, `express-rate-limit` (100 req / 15 min / IP), and a CORS allowlist.
- Logging goes through `server/utils/logger.js` — **never bare `console.*`**. `debug`/`cache`
  are gated behind `process.env.DEBUG`; `info`/`warn`/`request` are dev-only.
- `app.listen` is skipped when `NODE_ENV` is `production` or `test`; the app is exported.
- Payloads are passed through verbatim (`res.json(data)`) — the backend never reshapes them.

## Frontend

- **Pages** live directly in `frontend/src/` as PascalCase `.jsx` (`PlayerInfo.jsx`,
  `Leaderboard.jsx`, `PlayerProfile.jsx`, `Stats.jsx`, `TableInfo.jsx`,
  `PlayerComparison.jsx`). Reusable pieces in `src/components/`, hooks in `src/hooks/`,
  pure helpers in `src/utils/`, API layer in `src/api/loungeApi.js`, constants in
  `src/config/`.
- **State**: local `useState` only — no Redux/Zustand/React Query. The one cross-cutting
  store is `SettingsContext` (split across `context/settingsContext.js` and
  `context/SettingsContext.jsx` to satisfy `react-refresh` lint rules). URL search params
  are the source of truth for season / mmrType / pagination / filters; per-view UI prefs go
  to `sessionStorage` under keys declared at the top of `PlayerDetailView.jsx`.
- **Styling**: plain global CSS — `src/index.css` plus a single large `src/App.css` with
  kebab-case class names. **No Tailwind, no CSS modules.** Accessibility attributes
  (`aria-*`, `role`, `sr-only`, `aria-live`) are used consistently; keep that up.
- **Shared hooks**: `useAbortableRequest` (cancels the previous in-flight request),
  `usePlayerDetails`, `useSeasonMmrSelection`. Prefer these over ad-hoc `fetch` + `useEffect`.
- Recharts is `lazy()`-imported inside `PlayerDetailView.jsx` behind `Suspense`, and split
  into its own chunk in `vite.config.js`. Keep it out of the main bundle.

## Domain model

The upstream shapes are documented in `API-GET-Endpoints.md`. Things that bite:

- `playerDetails.mmrChanges` mixes real events with penalties/bonuses. **Always filter to
  `reason === "Table"` first** — `utils/playerStats.js` and `utils/chartUtils.js` do.
  Other `reason` values: `Strike`, `TableDelete`, `Bonus`, `Placement`.
- `tier === "SQ"` marks a **Squad Queue** event. This is the only SQ discriminator — it is
  *not* the same as "has partners", since non-SQ team events exist (e.g. tier `S` with
  `numTeams: 12`). The API's own `noSQAverageScore` / `noSQPartnerAverage` are reproduced
  exactly by excluding `tier === "SQ"` table events.
- `partnerScores` averages are means of the **flattened** arrays across events (a 3v3
  contributes 2 values, an FFA contributes 0) — not a mean of per-event means.
- `changeId` on a table event **is** the table ID; link to `/table/:changeId`.
- Game id: `mkworld` for season < 2, `mkworld12p` / `mkworld24p` for season ≥ 2
  (`api/loungeApi.js`).
- Rank thresholds are per season *and* per mmrType — `getThresholds(season, mmrType)` in
  `utils/playerUtils.js`.

### Bumping the season

Season is cross-cutting. All of these must change together:

- `server.js` — `CURRENT_SEASON`
- `frontend/src/config/seasons.js` — `CURRENT_SEASON`
- `frontend/src/components/SeasonSelector.jsx` — the option list
- `frontend/src/utils/playerUtils.js` — rank threshold tables, if they changed
- `tests/backend/api.validation.test.js` — the season-default assertions

## Testing

- **Backend**: node's built-in `node:test` + `node:assert/strict` + `supertest`. axios is
  mocked with `t.mock.method(axios, "get", ...)`. `process.env.NODE_ENV = "test"` is set at
  the top of the file so the app doesn't listen.
- **Frontend**: Vitest + Testing Library. Config is **inlined in `frontend/vite.config.js`**
  (`test: { globals: true, environment: "jsdom" }`) — there is no `vitest.config.js` and no
  setup file. Tests are co-located in `__tests__/` folders next to the source.
  `PlayerDetailView.test.jsx` mocks `recharts`, `react-world-flags` and `useNavigate`.
- Prefer putting new logic in `src/utils/` as a pure function so it can be unit-tested
  without rendering.

## Gotchas

- **Root `node_modules/` is committed** and there is no root `.gitignore` (only
  `frontend/.gitignore`). Be careful not to stage dependency churn.
- Backend is CommonJS (`require`), frontend is ESM (`import`). Don't mix.
- Root `package.json` metadata is stale: `"name": "js_practice"`, `"main": "code.js"`
  (that file doesn't exist).
- ESLint config is frontend-only and flat-config. It sets
  `no-unused-vars: ["error", { varsIgnorePattern: "^[A-Z_]" }]`, so unused capitalised
  imports don't error.
- Indentation is inconsistent across files (mostly 2-space; `Leaderboard.jsx`,
  `Selector.jsx`, `SeasonSelector.jsx`, `MMRSelector.jsx` are 4-space). Match the file
  you're editing.
- Source is Prettier-formatted with the experimental ternary style, but there is no Prettier
  config committed — match surrounding formatting by hand.
