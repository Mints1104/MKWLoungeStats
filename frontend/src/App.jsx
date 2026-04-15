import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import Navigation from './components/Navigation'
import PlayerInfo from './PlayerInfo'
import PlayerComparison from './PlayerComparison'
import Leaderboard from './Leaderboard'
import PlayerProfile from './PlayerProfile'
import TableInfo from './TableInfo'
import Stats from './Stats'

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function ScrollRestorationManager() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const previous = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
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
        <p>
          {description}
        </p>
        <p>
          Example: {example}
        </p>
        <Link className="player-button" to={linkTo} style={{ display: 'inline-block', width: 'auto' }}>
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollRestorationManager />
      <ScrollToTop />
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
  )
}

export default App
