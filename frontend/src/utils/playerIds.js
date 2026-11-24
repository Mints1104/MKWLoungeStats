// Favourites, recent searches and links all use player names, but a Lounge player
// can rename and their old name then 404s. Remembering the ID behind each name a
// profile has loaded lets an old name be followed to the new one.

export const PLAYER_IDS_KEY = "playerIds";
const MAX_REMEMBERED = 200;

function readIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAYER_IDS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ?
        parsed
      : {};
  } catch {
    return {};
  }
}

const nameKey = (name) => (typeof name === "string" ? name.trim().toLowerCase() : "");

/** Records that `name` belongs to player `id` (latest first, capped). */
export function rememberPlayerId(name, id) {
  const key = nameKey(name);
  if (!key || !Number.isInteger(id)) return;

  const ids = readIds();
  if (ids[key] === id) return;
  delete ids[key];
  // Newest last; drop the oldest once full
  const entries = [...Object.entries(ids), [key, id]].slice(-MAX_REMEMBERED);
  try {
    localStorage.setItem(PLAYER_IDS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // ignore storage failures
  }
}

/** The player ID last seen behind `name` (case-insensitive), or null. */
export function getRememberedPlayerId(name) {
  const id = readIds()[nameKey(name)];
  return Number.isInteger(id) ? id : null;
}
