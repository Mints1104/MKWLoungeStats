import { useMemo, useState, useEffect } from "react";
import {
  DEFAULT_GAME_MODE,
  SETTINGS_STORAGE_KEY,
  SettingsContext,
  sanitizeGameMode,
} from "./settingsContext";

function loadStoredGameMode() {
  if (typeof window === "undefined") {
    return DEFAULT_GAME_MODE;
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return sanitizeGameMode(stored);
  } catch {
    return DEFAULT_GAME_MODE;
  }
}

export function SettingsProvider({ children }) {
  const [defaultGameMode, setDefaultGameModeState] = useState(loadStoredGameMode);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        String(defaultGameMode),
      );
    } catch {
      // Ignore localStorage write failures in restricted environments.
    }
  }, [defaultGameMode]);

  const setDefaultGameMode = (value) => {
    setDefaultGameModeState(sanitizeGameMode(value));
  };

  const value = useMemo(
    () => ({
      defaultGameMode,
      setDefaultGameMode,
    }),
    [defaultGameMode],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}
