import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigationType,
  Link,
} from "react-router-dom";
import { useEffect, useRef } from "react";
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

  const savePosition = (y) => {
    positionsRef.current.set(location.key, y);
    try {
      const pathKey = `${location.pathname}${location.search}`;
      sessionStorage.setItem(`scroll:${location.key}`, String(y));
      sessionStorage.setItem(`scroll:${pathKey}`, String(y));
    } catch {
      // ignore sessionStorage failures
    }
  };

  const readSavedPosition = () => {
    const inMemory = positionsRef.current.get(location.key);
    if (inMemory != null) return inMemory;
    try {
      const pathKey = `${location.pathname}${location.search}`;
      const rawByKey = sessionStorage.getItem(`scroll:${location.key}`);
      const rawByPath = sessionStorage.getItem(`scroll:${pathKey}`);
      const raw = rawByKey ?? rawByPath;
      if (raw == null) return null;
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  };

  const restoreWithRetry = (targetY, attempt = 0) => {
    const maxAttempts = 10;
    const scrollHeight = document.documentElement.scrollHeight;
    const maxY = Math.max(0, scrollHeight - window.innerHeight);

    if (targetY <= maxY || attempt >= maxAttempts) {
      window.scrollTo(0, Math.min(targetY, maxY));
      return;
    }

    window.scrollTo(0, maxY);
    setTimeout(() => restoreWithRetry(targetY, attempt + 1), 60);
  };

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
  }, [location.key, location.pathname, location.search]);

  useEffect(() => {
    if (navigationType === "POP") {
      const savedPosition = readSavedPosition();
      const target = savedPosition ?? 0;
      setTimeout(() => restoreWithRetry(target), 0);
      return;
    }

    window.scrollTo(0, 0);
  }, [location.key, navigationType]);

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
