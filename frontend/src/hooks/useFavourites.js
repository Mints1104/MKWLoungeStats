import { useCallback, useSyncExternalStore } from "react";

export const FAVOURITES_KEY = "favouritePlayers";
const MAX_FAVOURITES = 30;
const listeners = new Set();
const EMPTY = [];

// Cached so useSyncExternalStore sees a stable snapshot between changes
let cachedRaw = null;
let cachedFavourites = EMPTY;

function readFavourites() {
  let raw = null;
  try {
    raw = localStorage.getItem(FAVOURITES_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedFavourites;

  cachedRaw = raw;
  try {
    const parsed = JSON.parse(raw || "[]");
    cachedFavourites =
      Array.isArray(parsed) ?
        parsed.filter((name) => typeof name === "string" && name.trim())
      : EMPTY;
  } catch {
    cachedFavourites = EMPTY;
  }
  return cachedFavourites;
}

function writeFavourites(names) {
  try {
    localStorage.setItem(
      FAVOURITES_KEY,
      JSON.stringify(names.slice(0, MAX_FAVOURITES)),
    );
  } catch {
    // Ignore localStorage write failures in restricted environments
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  // Other tabs changing favourites
  const onStorage = (event) => {
    if (event.key === FAVOURITES_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * Favourite players, saved in localStorage and shared by every component (and tab)
 * that uses the hook. Names are matched case-insensitively.
 */
export function useFavourites() {
  const favourites = useSyncExternalStore(subscribe, readFavourites, () => EMPTY);

  const isFavourite = useCallback(
    (name) => favourites.some((saved) => sameName(saved, name ?? "")),
    [favourites],
  );

  const toggleFavourite = useCallback((name) => {
    const clean = typeof name === "string" ? name.trim() : "";
    if (!clean) return;
    const current = readFavourites();
    writeFavourites(
      current.some((saved) => sameName(saved, clean)) ?
        current.filter((saved) => !sameName(saved, clean))
      : [clean, ...current],
    );
  }, []);

  return { favourites, isFavourite, toggleFavourite };
}

export default useFavourites;
