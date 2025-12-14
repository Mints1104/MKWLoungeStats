import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import Navigation from './components/Navigation'
import PlayerInfo from './PlayerInfo'
import PlayerComparison from './PlayerComparison'
import Leaderboard from './Leaderboard'
import PlayerProfile from './PlayerProfile'

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navigation />
      <Routes>
        <Route path="/" element={<PlayerInfo />} />
        <Route path="/compare" element={<PlayerComparison />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/player/:playerName" element={<PlayerProfile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
