import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigationType,
  Link,
} from "react-router-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import "./App.css";
import Navigation from "./components/Navigation";
import PlayerInfo from "./PlayerInfo";
import PlayerComparison from "./PlayerComparison";
import Leaderboard from "./Leaderboard";
import PlayerProfile from "./PlayerProfile";
import TableInfo from "./TableInfo";
import Stats from "./Stats";
import { SettingsProvider } from "./context/SettingsContext.jsx";

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
    if (key.startsWith(pathname) && value > 0) {
      return value;
    }
  }

  const storagePrefix = `scroll:${pathname}`;
  let best = null;
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const storageKey = sessionStorage.key(i);
      if (storageKey == null || !storageKey.startsWith(storagePrefix)) {
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

  const savePosition = useCallback(
    (y) => {
      positionsRef.current.set(scrollKey, y);
      try {
        sessionStorage.setItem(`scroll:${scrollKey}`, String(y));
      } catch {
        // ignore sessionStorage failures
      }
    },
    [scrollKey],
  );

  const readSavedPosition = useCallback(() => {
    const inMemory = positionsRef.current.get(scrollKey);
    if (inMemory != null && inMemory > 0) {
      return inMemory;
    }
    try {
      const raw = sessionStorage.getItem(`scroll:${scrollKey}`);
      if (raw != null) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
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
        savePosition(window.scrollY);
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
  }, [scrollKey, savePosition]);

  useLayoutEffect(() => {
    const savedPosition = readSavedPosition();
    if (savedPosition != null) {
      endRestoreSessionRef.current = startScrollRestoreSession(savedPosition);
      savePosition(savedPosition);
    } else if (navigationType === "PUSH") {
      window.scrollTo(0, 0);
    }

    return () => {
      endRestoreSession();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (scrollYRef.current > 0) {
        savePosition(scrollYRef.current);
      }
    };
  }, [
    scrollKey,
    navigationType,
    readSavedPosition,
    savePosition,
    endRestoreSession,
  ]);

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
        <p>Example: {example}</p>
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

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <ScrollRestorationManager />
        <ScrollRestoration />
        <Navigation />
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
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
