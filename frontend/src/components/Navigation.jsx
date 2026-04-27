import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import { useSettings } from "../context/settingsContext";

function Navigation() {
  const location = useLocation();
  const { defaultGameMode, setDefaultGameMode } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDialogRef = useRef(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen]);

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      closeSettings();
    }
  };

  return (
    <>
      <nav className="navigation" aria-label="Main navigation">
        <div className="nav-container">
          <Link
            to="/"
            className="nav-logo"
            aria-label="MKWorld Lounge Stats - Home"
          >
            <span className="nav-logo-mark" aria-hidden="true"></span>
            <span className="nav-logo-text">MKWorld Lounge Stats</span>
          </Link>
          <div className="nav-links" role="list">
            <Link
              to="/"
              className={`nav-link ${location.pathname === "/" ? "nav-link-active" : ""}`}
              aria-current={location.pathname === "/" ? "page" : undefined}
            >
              Player Stats
            </Link>
            <Link
              to="/compare"
              className={`nav-link ${location.pathname === "/compare" ? "nav-link-active" : ""}`}
              aria-current={location.pathname === "/compare" ? "page" : undefined}
            >
              Compare
            </Link>
            <Link
              to="/leaderboard"
              className={`nav-link ${location.pathname === "/leaderboard" ? "nav-link-active" : ""}`}
              aria-current={
                location.pathname === "/leaderboard" ? "page" : undefined
              }
            >
              Leaderboard
            </Link>
            <Link
              to="/stats"
              className={`nav-link ${location.pathname === "/stats" ? "nav-link-active" : ""}`}
              aria-current={location.pathname === "/stats" ? "page" : undefined}
            >
              Stats
            </Link>
            <button
              type="button"
              className="nav-link nav-settings-trigger"
              onClick={openSettings}
              aria-haspopup="dialog"
              aria-expanded={isSettingsOpen}
              aria-controls="app-settings-dialog"
              aria-label="Open settings"
            >
              <FiSettings className="nav-settings-icon" aria-hidden="true" />
              <span className="sr-only">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {isSettingsOpen && (
        <div
          className="settings-overlay"
          onClick={handleOverlayClick}
          role="presentation"
        >
          <div
            id="app-settings-dialog"
            ref={settingsDialogRef}
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="settings-header">
              <h2 id="settings-title">Settings</h2>
              <button
                type="button"
                className="settings-close"
                onClick={closeSettings}
                aria-label="Close settings"
              >
                x
              </button>
            </div>
            <p className="settings-description">
              Set the default game mode for selectors across the app.
            </p>
            <div className="settings-option-group" role="radiogroup" aria-label="Default game mode">
              <label className="settings-option">
                <input
                  type="radio"
                  name="default-game-mode"
                  value="24"
                  checked={defaultGameMode === 24}
                  onChange={() => setDefaultGameMode(24)}
                />
                24-player
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="default-game-mode"
                  value="12"
                  checked={defaultGameMode === 12}
                  onChange={() => setDefaultGameMode(12)}
                />
                12-player
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navigation;
