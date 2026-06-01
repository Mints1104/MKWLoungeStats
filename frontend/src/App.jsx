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

function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef(new Map());
  const rafRef = useRef(null);

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
    if (inMemory != null) return inMemory;
    try {
      const raw = sessionStorage.getItem(`scroll:${scrollKey}`);
      if (raw == null) return null;
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }, [scrollKey]);

  const restoreWithRetry = useCallback(function restoreWithRetryInner(
    targetY,
    attempt = 0,
  ) {
    const maxAttempts = 10;
    const scrollHeight = document.documentElement.scrollHeight;
    const maxY = Math.max(0, scrollHeight - window.innerHeight);

    if (targetY <= maxY || attempt >= maxAttempts) {
      window.scrollTo(0, Math.min(targetY, maxY));
      return;
    }

    window.scrollTo(0, maxY);
    setTimeout(() => restoreWithRetryInner(targetY, attempt + 1), 60);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
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
      savePosition(window.scrollY);
    };
  }, [scrollKey, savePosition]);

  useLayoutEffect(() => {
    const savedPosition = readSavedPosition();
    if (savedPosition != null) {
      restoreWithRetry(savedPosition);
      return;
    }

    if (navigationType === "PUSH") {
      window.scrollTo(0, 0);
    }
  }, [scrollKey, navigationType, readSavedPosition, restoreWithRetry]);

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
