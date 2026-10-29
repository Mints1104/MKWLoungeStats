import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigationType,
  Link,
} from "react-router-dom";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import "./App.css";
import Navigation from "./components/Navigation";
import PlayerInfo from "./PlayerInfo";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { isScrollKeyOnPath } from "./utils/scrollKeys";

// Only the home page ships in the entry bundle; the rest (and Recharts, which Stats
// imports directly) load when their route is first visited.
const PlayerComparison = lazy(() => import("./PlayerComparison"));
const Leaderboard = lazy(() => import("./Leaderboard"));
const PlayerProfile = lazy(() => import("./PlayerProfile"));
const TableInfo = lazy(() => import("./TableInfo"));
const Stats = lazy(() => import("./Stats"));

const SCROLL_RESTORE_TOLERANCE_PX = 2;
const SCROLL_RESTORE_MAX_MS = 5000;

function maxScrollY() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function scrollToY(targetY) {
  window.scrollTo(0, Math.min(targetY, maxScrollY()));
}

function isScrollRestored(targetY) {
  return Math.abs(window.scrollY - targetY) <= SCROLL_RESTORE_TOLERANCE_PX;
}

function findSavedPositionOnPath(pathname, positionsRef) {
  for (const [key, value] of positionsRef.current.entries()) {
    if (isScrollKeyOnPath(key, pathname) && value > 0) {
      return value;
    }
  }

  let best = null;
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const storageKey = sessionStorage.key(i);
      if (
        storageKey == null ||
        !storageKey.startsWith("scroll:") ||
        !isScrollKeyOnPath(storageKey.slice("scroll:".length), pathname)
      ) {
        continue;
      }
      const parsed = Number(sessionStorage.getItem(storageKey));
      if (!Number.isNaN(parsed) && parsed > 0) {
        best = best == null ? parsed : Math.max(best, parsed);
      }
    }
  } catch {
    // ignore sessionStorage failures
  }
  return best;
}

function startScrollRestoreSession(targetY) {
  let finished = false;
  let observer = null;
  let timeoutId = null;

  const tryRestore = () => {
    scrollToY(targetY);
    return isScrollRestored(targetY);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    observer?.disconnect();
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
    tryRestore();
  };

  if (tryRestore()) {
    return finish;
  }

  observer = new ResizeObserver(() => {
    if (tryRestore()) {
      finish();
    }
  });
  observer.observe(document.documentElement);
  timeoutId = setTimeout(finish, SCROLL_RESTORE_MAX_MS);

  return finish;
}

function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef(new Map());
  const rafRef = useRef(null);
  const scrollYRef = useRef(0);

  const scrollKey = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const entries = Array.from(params.entries()).sort((a, b) => {
      if (a[0] === b[0]) return a[1].localeCompare(b[1]);
      return a[0].localeCompare(b[0]);
    });
    const normalized = new URLSearchParams();
    entries.forEach(([key, value]) => normalized.append(key, value));
    const query = normalized.toString();
    return query ? `${location.pathname}?${query}` : location.pathname;
  }, [location.pathname, location.search]);

  // The key scroll events are saved under. It moves to the new URL in the layout
  // effect, before any scroll a navigation causes, so a scroll event that lands
  // after navigating (scrolling to the top, the browser clamping a shorter page)
  // is never saved against the page that was just left.
  const activeKeyRef = useRef(scrollKey);

  const savePosition = useCallback((key, y) => {
    positionsRef.current.set(key, y);
    try {
      sessionStorage.setItem(`scroll:${key}`, String(y));
    } catch {
      // ignore sessionStorage failures
    }
  }, []);

  // A saved 0 counts: it means this URL was left at the top. Only a URL with no
  // saved position at all borrows one from the same path.
  const readSavedPosition = useCallback(() => {
    const inMemory = positionsRef.current.get(scrollKey);
    if (inMemory != null) {
      return inMemory;
    }
    try {
      const raw = sessionStorage.getItem(`scroll:${scrollKey}`);
      if (raw != null) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch {
      // ignore sessionStorage failures
    }
    return findSavedPositionOnPath(location.pathname, positionsRef);
  }, [scrollKey, location.pathname]);

  const endRestoreSessionRef = useRef(null);

  const endRestoreSession = useCallback(() => {
    if (endRestoreSessionRef.current) {
      endRestoreSessionRef.current();
      endRestoreSessionRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        savePosition(activeKeyRef.current, window.scrollY);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [savePosition]);

  useLayoutEffect(() => {
    activeKeyRef.current = scrollKey;

    // REPLACE is a page syncing its own state into the URL (filters, pagination):
    // leave the scroll alone and let a restore that is still waiting for content
    // finish.
    if (navigationType !== "REPLACE") {
      endRestoreSession();

      if (navigationType === "POP") {
        // Back/forward or a reload: return to where this URL was left.
        const savedPosition = readSavedPosition();
        if (savedPosition != null) {
          endRestoreSessionRef.current =
            startScrollRestoreSession(savedPosition);
          savePosition(scrollKey, savedPosition);
        }
      } else {
        // A new navigation starts at the top, even on a page visited before.
        window.scrollTo(0, 0);
        savePosition(scrollKey, 0);
      }
    }

    return () => {
      // Drop the pending frame-throttled save and write this URL's latest position
      // directly, before the key moves on.
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (scrollYRef.current > 0) {
        savePosition(scrollKey, scrollYRef.current);
      }
    };
    // location.key: re-run for a new navigation to the same URL (e.g. the nav link
    // to the page already open), which should still scroll to the top.
  }, [
    location.key,
    scrollKey,
    navigationType,
    readSavedPosition,
    savePosition,
    endRestoreSession,
  ]);

  useEffect(() => endRestoreSession, [endRestoreSession]);

  return null;
}

function ScrollRestorationManager() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const previous = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = previous;
      };
    }
  }, []);

  return null;
}

function MissingRouteParamPage({
  title,
  description,
  example,
  linkTo,
  linkLabel,
}) {
  return (
    <div className="player-info-page">
      <div className="player-card">
        <h1>{title}</h1>
        <p>{description}</p>
        {example && <p>Example: {example}</p>}
        <Link
          className="player-button"
          to={linkTo}
          style={{ display: "inline-block", width: "auto" }}
        >
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="player-info-page">
      <div className="player-card">
        <div
          className="loading-skeleton"
          aria-live="polite"
          aria-label="Loading page"
        >
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <ScrollRestorationManager />
        <ScrollRestoration />
        <Navigation />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<PlayerInfo />} />
            <Route
              path="/player"
              element={
                <MissingRouteParamPage
                  title="Player Not Specified"
                  description="This route needs a username after /player."
                  example="/player/Player123"
                  linkTo="/"
                  linkLabel="Go To Player Search"
                />
              }
            />
            <Route path="/compare" element={<PlayerComparison />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/stats" element={<Stats />} />
            <Route
              path="/table"
              element={
                <MissingRouteParamPage
                  title="Table Not Specified"
                  description="This route needs a table ID after /table."
                  example="/table/123456"
                  linkTo="/leaderboard"
                  linkLabel="Go To Leaderboard"
                />
              }
            />
            <Route path="/table/:tableId" element={<TableInfo />} />
            <Route path="/player/:playerName" element={<PlayerProfile />} />
            <Route
              path="*"
              element={
                <MissingRouteParamPage
                  title="Page Not Found"
                  description="There is no page at this address."
                  linkTo="/"
                  linkLabel="Go To Player Search"
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
